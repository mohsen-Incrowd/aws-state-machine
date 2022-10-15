"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Choreography = exports.ChoreographyInsights = void 0;
/*
  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
  Permission is hereby granted, free of charge, to any person obtaining a copy of this
  software and associated documentation files (the "Software"), to deal in the Software
  without restriction, including without limitation the rights to use, copy, modify,
  merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
  INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
  PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
// SPDX-License-Identifier: MIT-0
const cdk = require("constructs");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const aws_stepfunctions_1 = require("aws-cdk-lib/aws-stepfunctions");
const aws_logs_1 = require("aws-cdk-lib/aws-logs");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const aws_events_1 = require("aws-cdk-lib/aws-events");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_events_targets_1 = require("aws-cdk-lib/aws-events-targets");
const choreography_state_1 = require("./choreography-state");
const aws_cdk_lib_1 = require("aws-cdk-lib");
/**
 * Construct to provision core resources to support choreography monitoring with Step Functions.
 * The Construct provision the following resources:
 * - A DynamoDB Table to store Task Tokens
 * - A Lambda function to start a new Step Functions state machine execution with an explicit name
 * - A lambda function to handle events by reading a Task Token from DynamoDB and invoking Step Functions SendTaskSuccess to resume execution
 * The Construct allows to monitor multiple Choreographies
 */
class ChoreographyInsights extends cdk.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.choreographyList = new Array();
        this.logRetention = (props === null || props === void 0 ? void 0 : props.logRetention) || aws_logs_1.RetentionDays.ONE_YEAR;
        this.taskTokensTable = new aws_dynamodb_1.Table(this, 'TaskTokensTable', {
            partitionKey: {
                name: 'entityId',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'eventName',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            encryption: aws_dynamodb_1.TableEncryption.AWS_MANAGED,
            // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
            // the new table, and it will remain in your account until manually deleted. By setting the policy to 
            // DESTROY, cdk destroy will delete the table (even if it has data in it)
            // removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code,
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true
        });
        this.lambdaBaseExecutionRolePolicy = this.basicLambdaExecutionRolePolicy();
        this.eventHandlerTask = this.eventHandlerFunction(this.taskTokensTable);
        this.initWorkflowTask = this.initWorkflowFunction(this.taskTokensTable);
        this.eventBus = props ? props.eventBus : new aws_events_1.EventBus(this, "Bus");
        this.defaultStateBuilder = new choreography_state_1.ChoreographyStateBuilder(this, "Builder", {
            taskTokenTable: this.taskTokensTable
        });
    }
    /**
     * Bind the choreography provided as input to the resources provisioned by the ChoreographyInsights construct.
     * It adds relevant permission to interact with the Choreography State Machine and creates 2 EventBridge rules
     * to match the initial event and subsequent events that belongs to the choreography
     * @param choreography
     */
    addChoreography(choreography) {
        choreography.stateMachine.grantStartExecution(this.initWorkflowTask);
        choreography.stateMachine.grantTaskResponse(this.eventHandlerTask);
        choreography.stateMachine.grantExecution(this.eventHandlerTask, "states:StopExecution");
        const entityId = this.getEntityId(choreography.startEvent);
        //Routing of the event that triggers the Workflow execution
        new aws_events_1.Rule(this, `${choreography.node.id}StartEventRule`, {
            eventBus: this.eventBus,
            eventPattern: choreography.startEvent.pattern,
            targets: [new aws_events_targets_1.LambdaFunction(this.initWorkflowTask, {
                    event: aws_events_1.RuleTargetInput.fromObject({
                        stateMachineArn: choreography.stateMachine.stateMachineArn,
                        name: entityId,
                        input: {
                            detail: aws_events_1.EventField.fromPath('$.detail'),
                            eventName: aws_events_1.EventField.fromPath('$.detail-type'),
                            entityId: this.getEntityId(choreography.startEvent)
                        }
                    })
                })]
        });
        //Routing subsequent events to trigger state machine transition
        new aws_events_1.Rule(this, `${choreography.node.id}NextEventRule`, {
            eventBus: this.eventBus,
            eventPattern: choreography.events[0].pattern,
            targets: [new aws_events_targets_1.LambdaFunction(this.eventHandlerTask, {
                    event: aws_events_1.RuleTargetInput.fromObject({
                        detail: aws_events_1.EventField.fromPath('$.detail'),
                        eventName: aws_events_1.EventField.fromPath('$.detail-type'),
                        entityId: this.getEntityId(choreography.events[0])
                    })
                })]
        });
        this.choreographyList.push(choreography);
    }
    /**
     * Lambda function that handles events from the custom event bus,
     * retrieves task token based on entityId and event type and feed
     * the result to Step Functions calling SendTaskSuccess.
     * @param taskTokensTable
     * @returns
     */
    eventHandlerFunction(taskTokensTable) {
        const eventHandler = new aws_lambda_nodejs_1.NodejsFunction(this, 'EventHandler', {
            entry: __dirname + "/../resources/event_handler/app.ts",
            handler: 'handler',
            environment: {
                TASK_TOKENS_TABLE_NAME: taskTokensTable.tableName
            },
            reservedConcurrentExecutions: 20,
            role: new aws_iam_1.Role(this, 'CustomEventHandlerExecutionRole', {
                assumedBy: new aws_iam_1.ServicePrincipal('lambda.amazonaws.com'),
                managedPolicies: [this.lambdaBaseExecutionRolePolicy]
            }),
            retryAttempts: 2
        });
        taskTokensTable.grantReadWriteData(eventHandler);
        return eventHandler;
    }
    /**
     * Lambda function that start the execution of the workflow state machine
     * @param taskTokensTable
     * @returns
     */
    initWorkflowFunction(taskTokensTable) {
        //Initialize Workflow Function
        const initWorkflowHandler = new aws_lambda_nodejs_1.NodejsFunction(this, "InitWorkflowHandler", {
            entry: __dirname + "/../resources/initialize_workflow/app.ts",
            handler: 'handler',
            environment: {
                TASK_TOKENS_TABLE_NAME: taskTokensTable.tableName
            },
            reservedConcurrentExecutions: 5,
            role: new aws_iam_1.Role(this, 'CustomInitWorkflowExecutionRole', {
                assumedBy: new aws_iam_1.ServicePrincipal('lambda.amazonaws.com'),
                managedPolicies: [this.lambdaBaseExecutionRolePolicy]
            }),
            retryAttempts: 2
        });
        taskTokensTable.grantWriteData(initWorkflowHandler);
        return initWorkflowHandler;
    }
    basicLambdaExecutionRolePolicy() {
        return new aws_iam_1.ManagedPolicy(this, "CustomBasicLambdaExecuctionRolePolicy", {
            statements: [
                new aws_iam_1.PolicyStatement({
                    actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
                    resources: [`arn:aws:logs:${aws_cdk_lib_1.Stack.of(this).region}:${aws_cdk_lib_1.Stack.of(this).account}:log-group:/aws/lambda/${aws_cdk_lib_1.Stack.of(this).stackName}*:*`]
                })
            ]
        });
    }
    getEntityId(event) {
        const path = event.entityIdJsonPath ? event.entityIdJsonPath : '$.detail.id';
        return aws_events_1.EventField.fromPath(path);
    }
}
exports.ChoreographyInsights = ChoreographyInsights;
/**
 * Construct that models a choreography definition as a Step Functions state machine.
 * It checks that the definition provided in the properties contains only allowed State types (i.e. Task states must be instanceof ChoreographyState)
 */
class Choreography extends cdk.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.checkDefinition(props.definition);
        this.startEvent = props.startEvent;
        this.events = props.events;
        this.stateMachine = new aws_stepfunctions_1.StateMachine(this, "StateMachine", {
            definition: props.definition,
            stateMachineType: aws_stepfunctions_1.StateMachineType.STANDARD,
            timeout: props.timeout
        });
    }
    checkDefinition(definition) {
        const states = aws_stepfunctions_1.State.findReachableStates(definition.startState);
        states.forEach(s => {
            if ((s instanceof aws_stepfunctions_1.TaskStateBase) && !(s instanceof choreography_state_1.ChoreographyState)) {
                throw new Error(`State ${s.id} must be an instance of class ChoreographyState.`);
            }
        });
    }
}
exports.Choreography = Choreography;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hvcmVvZ3JhcGh5LWluc2lnaHRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2hvcmVvZ3JhcGh5LWluc2lnaHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7Ozs7Ozs7Ozs7O0VBYUU7QUFDRixpQ0FBaUM7QUFDakMsa0NBQWtDO0FBQ2xDLDJEQUE4RjtBQUM5RixxRUFBaUg7QUFDakgsbURBQXFEO0FBQ3JELHFFQUErRDtBQUUvRCx1REFBbUc7QUFDbkcsaURBQXFIO0FBQ3JILHVFQUFnRTtBQUNoRSw2REFBbUY7QUFDbkYsNkNBQThDO0FBMkI5Qzs7Ozs7OztHQU9HO0FBQ0gsTUFBYSxvQkFBcUIsU0FBUSxHQUFHLENBQUMsU0FBUztJQWFyRCxZQUFZLEtBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQWlDO1FBQzdFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFOWCxxQkFBZ0IsR0FBbUIsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQVFyRCxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLFlBQVksS0FBSSx3QkFBYSxDQUFDLFFBQVEsQ0FBQztRQUVsRSxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksb0JBQUssQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDeEQsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxVQUFVO2dCQUNoQixJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNO2FBQzNCO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxXQUFXO2dCQUNqQixJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNO2FBQzNCO1lBRUQsVUFBVSxFQUFFLDhCQUFlLENBQUMsV0FBVztZQUN2QyxnR0FBZ0c7WUFDaEcsc0dBQXNHO1lBQ3RHLHlFQUF5RTtZQUN6RSxvRkFBb0Y7WUFDcEYsV0FBVyxFQUFFLDBCQUFXLENBQUMsZUFBZTtZQUN4QyxtQkFBbUIs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QUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUM7UUFDbkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQzNCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxnQ0FBWSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDekQsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO1lBQzVCLGdCQUFnQixFQUFFLG9DQUFnQixDQUFDLFFBQVE7WUFDM0MsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO1NBQ3ZCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxlQUFlLENBQUMsVUFBc0I7UUFDNUMsTUFBTSxNQUFNLEdBQVkseUJBQUssQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNqQixJQUFHLENBQUMsQ0FBQyxZQUFZLGlDQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLHNDQUFpQixDQUFDLEVBQUU7Z0JBQ3BFLE1BQU0sSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxrREFBa0QsQ0FBQyxDQUFBO2FBQ2pGO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUExQkQsb0NBMEJDIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICBDb3B5cmlnaHQgMjAyMCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxyXG4gIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpc1xyXG4gIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZVxyXG4gIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSxcclxuICBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvXHJcbiAgcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLlxyXG4gIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1IgSU1QTElFRCxcclxuICBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQVxyXG4gIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFRcclxuICBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT05cclxuICBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEVcclxuICBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cclxuKi9cclxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IE1JVC0wXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tIFwiY29uc3RydWN0c1wiO1xyXG5pbXBvcnQgeyBBdHRyaWJ1dGVUeXBlLCBCaWxsaW5nTW9kZSwgVGFibGUsIFRhYmxlRW5jcnlwdGlvbiB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGJcIjtcclxuaW1wb3J0IHsgU3RhdGVNYWNoaW5lLCBTdGF0ZU1hY2hpbmVUeXBlLCBUYXNrU3RhdGVCYXNlLCBJQ2hhaW5hYmxlLCBTdGF0ZSB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc3RlcGZ1bmN0aW9uc1wiO1xyXG5pbXBvcnQgeyBSZXRlbnRpb25EYXlzIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XHJcbmltcG9ydCB7IE5vZGVqc0Z1bmN0aW9uIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzXCI7XHJcbmltcG9ydCB7IElGdW5jdGlvbiwgVHJhY2luZyB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBFdmVudFBhdHRlcm4sIEV2ZW50QnVzLCBSdWxlLCBSdWxlVGFyZ2V0SW5wdXQsIEV2ZW50RmllbGQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcclxuaW1wb3J0IHsgTWFuYWdlZFBvbGljeSwgUG9saWN5LCBSb2xlLCBQb2xpY3lTdGF0ZW1lbnQsIFNlcnZpY2VQcmluY2lwYWwsIFBvbGljeURvY3VtZW50IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCB7IExhbWJkYUZ1bmN0aW9uIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0c1wiO1xyXG5pbXBvcnQgeyBDaG9yZW9ncmFwaHlTdGF0ZSwgQ2hvcmVvZ3JhcGh5U3RhdGVCdWlsZGVyIH0gZnJvbSBcIi4vY2hvcmVvZ3JhcGh5LXN0YXRlXCI7XHJcbmltcG9ydCB7IER1cmF0aW9uLCBTdGFjayB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDaG9yZW9ncmFwaHlJbnNpZ2h0c1Byb3BzIHtcclxuICBldmVudEJ1czogRXZlbnRCdXMsXHJcbiAgLyoqXHJcbiAgICogSG93IGxvbmcsIGluIGRheXMsIHRoZSBsb2cgY29udGVudHMgd2lsbCBiZSByZXRhaW5lZC5cclxuICAgKlxyXG4gICAqIFRvIHJldGFpbiBhbGwgbG9ncywgc2V0IHRoaXMgdmFsdWUgdG8gUmV0ZW50aW9uRGF5cy5JTkZJTklURS5cclxuICAgKlxyXG4gICAqIEBkZWZhdWx0IFJldGVudGlvbkRheXMuT05FX1lFQVJcclxuICAgKiBAc3RhYmlsaXR5IHN0YWJsZVxyXG4gICAqL1xyXG4gIGxvZ1JldGVudGlvbj86IFJldGVudGlvbkRheXNcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDaG9yZW9ncmFwaHlQcm9wcyB7XHJcbiAgZGVmaW5pdGlvbjogSUNoYWluYWJsZTtcclxuICBzdGFydEV2ZW50OiBDaG9yZW9ncmFwaHlFdmVudDtcclxuICBldmVudHM6IENob3Jlb2dyYXBoeUV2ZW50W107XHJcbiAgdGltZW91dD86IER1cmF0aW9uXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ2hvcmVvZ3JhcGh5RXZlbnQge1xyXG4gIHBhdHRlcm46IEV2ZW50UGF0dGVybjtcclxuICBlbnRpdHlJZEpzb25QYXRoPzogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0IHRvIHByb3Zpc2lvbiBjb3JlIHJlc291cmNlcyB0byBzdXBwb3J0IGNob3Jlb2dyYXBoeSBtb25pdG9yaW5nIHdpdGggU3RlcCBGdW5jdGlvbnMuXHJcbiAqIFRoZSBDb25zdHJ1Y3QgcHJvdmlzaW9uIHRoZSBmb2xsb3dpbmcgcmVzb3VyY2VzOlxyXG4gKiAtIEEgRHluYW1vREIgVGFibGUgdG8gc3RvcmUgVGFzayBUb2tlbnNcclxuICogLSBBIExhbWJkYSBmdW5jdGlvbiB0byBzdGFydCBhIG5ldyBTdGVwIEZ1bmN0aW9ucyBzdGF0ZSBtYWNoaW5lIGV4ZWN1dGlvbiB3aXRoIGFuIGV4cGxpY2l0IG5hbWVcclxuICogLSBBIGxhbWJkYSBmdW5jdGlvbiB0byBoYW5kbGUgZXZlbnRzIGJ5IHJlYWRpbmcgYSBUYXNrIFRva2VuIGZyb20gRHluYW1vREIgYW5kIGludm9raW5nIFN0ZXAgRnVuY3Rpb25zIFNlbmRUYXNrU3VjY2VzcyB0byByZXN1bWUgZXhlY3V0aW9uXHJcbiAqIFRoZSBDb25zdHJ1Y3QgYWxsb3dzIHRvIG1vbml0b3IgbXVsdGlwbGUgQ2hvcmVvZ3JhcGhpZXNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDaG9yZW9ncmFwaHlJbnNpZ2h0cyBleHRlbmRzIGNkay5Db25zdHJ1Y3Qge1xyXG5cclxuICBwdWJsaWMgcmVhZG9ubHkgdGFza1Rva2Vuc1RhYmxlOiBUYWJsZTtcclxuICBwdWJsaWMgcmVhZG9ubHkgZGVmYXVsdFN0YXRlQnVpbGRlcjogQ2hvcmVvZ3JhcGh5U3RhdGVCdWlsZGVyO1xyXG5cclxuICBwcml2YXRlIHJlYWRvbmx5IGV2ZW50SGFuZGxlclRhc2s6IElGdW5jdGlvbjtcclxuICBwcml2YXRlIHJlYWRvbmx5IGluaXRXb3JrZmxvd1Rhc2s6IElGdW5jdGlvbjtcclxuICBwcml2YXRlIGV2ZW50QnVzOiBFdmVudEJ1cztcclxuICBwcml2YXRlIGNob3Jlb2dyYXBoeUxpc3Q6IENob3Jlb2dyYXBoeVtdID0gbmV3IEFycmF5KCk7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBsb2dSZXRlbnRpb246IFJldGVudGlvbkRheXM7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBsYW1iZGFCYXNlRXhlY3V0aW9uUm9sZVBvbGljeTogTWFuYWdlZFBvbGljeTtcclxuICBwcml2YXRlIHJlYWRvbmx5IGxvZ1JldGVudGlvbkV4ZWN1dGlvblJvbGVQb2xpY3k6IE1hbmFnZWRQb2xpY3k7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IENob3Jlb2dyYXBoeUluc2lnaHRzUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgdGhpcy5sb2dSZXRlbnRpb24gPSBwcm9wcz8ubG9nUmV0ZW50aW9uIHx8IFJldGVudGlvbkRheXMuT05FX1lFQVI7XHJcblxyXG4gICAgdGhpcy50YXNrVG9rZW5zVGFibGUgPSBuZXcgVGFibGUodGhpcywgJ1Rhc2tUb2tlbnNUYWJsZScsIHtcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ2VudGl0eUlkJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklOR1xyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ2V2ZW50TmFtZScsXHJcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkdcclxuICAgICAgfSxcclxuICAgICAgXHJcbiAgICAgIGVuY3J5cHRpb246IFRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgLy8gVGhlIGRlZmF1bHQgcmVtb3ZhbCBwb2xpY3kgaXMgUkVUQUlOLCB3aGljaCBtZWFucyB0aGF0IGNkayBkZXN0cm95IHdpbGwgbm90IGF0dGVtcHQgdG8gZGVsZXRlXHJcbiAgICAgIC8vIHRoZSBuZXcgdGFibGUsIGFuZCBpdCB3aWxsIHJlbWFpbiBpbiB5b3VyIGFjY291bnQgdW50aWwgbWFudWFsbHkgZGVsZXRlZC4gQnkgc2V0dGluZyB0aGUgcG9saWN5IHRvIFxyXG4gICAgICAvLyBERVNUUk9ZLCBjZGsgZGVzdHJveSB3aWxsIGRlbGV0ZSB0aGUgdGFibGUgKGV2ZW4gaWYgaXQgaGFzIGRhdGEgaW4gaXQpXHJcbiAgICAgIC8vIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIE5PVCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvbiBjb2RlLFxyXG4gICAgICBiaWxsaW5nTW9kZTogQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmxhbWJkYUJhc2VFeGVjdXRpb25Sb2xlUG9saWN5ID0gdGhpcy5iYXNpY0xhbWJkYUV4ZWN1dGlvblJvbGVQb2xpY3koKTtcclxuXHJcbiAgICB0aGlzLmV2ZW50SGFuZGxlclRhc2sgPSB0aGlzLmV2ZW50SGFuZGxlckZ1bmN0aW9uKHRoaXMudGFza1Rva2Vuc1RhYmxlKTtcclxuICAgIHRoaXMuaW5pdFdvcmtmbG93VGFzayA9IHRoaXMuaW5pdFdvcmtmbG93RnVuY3Rpb24odGhpcy50YXNrVG9rZW5zVGFibGUpO1xyXG5cclxuICAgIHRoaXMuZXZlbnRCdXMgPSBwcm9wcyA/IHByb3BzLmV2ZW50QnVzIDogbmV3IEV2ZW50QnVzKHRoaXMsIFwiQnVzXCIpO1xyXG5cclxuICAgIHRoaXMuZGVmYXVsdFN0YXRlQnVpbGRlciA9IG5ldyBDaG9yZW9ncmFwaHlTdGF0ZUJ1aWxkZXIodGhpcywgXCJCdWlsZGVyXCIsIHtcclxuICAgICAgdGFza1Rva2VuVGFibGU6IHRoaXMudGFza1Rva2Vuc1RhYmxlXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEJpbmQgdGhlIGNob3Jlb2dyYXBoeSBwcm92aWRlZCBhcyBpbnB1dCB0byB0aGUgcmVzb3VyY2VzIHByb3Zpc2lvbmVkIGJ5IHRoZSBDaG9yZW9ncmFwaHlJbnNpZ2h0cyBjb25zdHJ1Y3QuXHJcbiAgICogSXQgYWRkcyByZWxldmFudCBwZXJtaXNzaW9uIHRvIGludGVyYWN0IHdpdGggdGhlIENob3Jlb2dyYXBoeSBTdGF0ZSBNYWNoaW5lIGFuZCBjcmVhdGVzIDIgRXZlbnRCcmlkZ2UgcnVsZXNcclxuICAgKiB0byBtYXRjaCB0aGUgaW5pdGlhbCBldmVudCBhbmQgc3Vic2VxdWVudCBldmVudHMgdGhhdCBiZWxvbmdzIHRvIHRoZSBjaG9yZW9ncmFwaHlcclxuICAgKiBAcGFyYW0gY2hvcmVvZ3JhcGh5IFxyXG4gICAqL1xyXG4gIHB1YmxpYyBhZGRDaG9yZW9ncmFwaHkoY2hvcmVvZ3JhcGh5OiBDaG9yZW9ncmFwaHkpIHtcclxuICAgIGNob3Jlb2dyYXBoeS5zdGF0ZU1hY2hpbmUuZ3JhbnRTdGFydEV4ZWN1dGlvbih0aGlzLmluaXRXb3JrZmxvd1Rhc2spO1xyXG4gICAgY2hvcmVvZ3JhcGh5LnN0YXRlTWFjaGluZS5ncmFudFRhc2tSZXNwb25zZSh0aGlzLmV2ZW50SGFuZGxlclRhc2spO1xyXG4gICAgY2hvcmVvZ3JhcGh5LnN0YXRlTWFjaGluZS5ncmFudEV4ZWN1dGlvbih0aGlzLmV2ZW50SGFuZGxlclRhc2ssIFwic3RhdGVzOlN0b3BFeGVjdXRpb25cIik7XHJcblxyXG4gICAgY29uc3QgZW50aXR5SWQgPSB0aGlzLmdldEVudGl0eUlkKGNob3Jlb2dyYXBoeS5zdGFydEV2ZW50KTtcclxuXHJcbiAgICAvL1JvdXRpbmcgb2YgdGhlIGV2ZW50IHRoYXQgdHJpZ2dlcnMgdGhlIFdvcmtmbG93IGV4ZWN1dGlvblxyXG4gICAgbmV3IFJ1bGUodGhpcywgYCR7Y2hvcmVvZ3JhcGh5Lm5vZGUuaWR9U3RhcnRFdmVudFJ1bGVgLCB7XHJcbiAgICAgIGV2ZW50QnVzOiB0aGlzLmV2ZW50QnVzLFxyXG4gICAgICBldmVudFBhdHRlcm46IGNob3Jlb2dyYXBoeS5zdGFydEV2ZW50LnBhdHRlcm4sXHJcbiAgICAgIHRhcmdldHM6IFtuZXcgTGFtYmRhRnVuY3Rpb24odGhpcy5pbml0V29ya2Zsb3dUYXNrLCB7XHJcbiAgICAgICAgZXZlbnQ6IFJ1bGVUYXJnZXRJbnB1dC5mcm9tT2JqZWN0KHtcclxuICAgICAgICAgIHN0YXRlTWFjaGluZUFybjogY2hvcmVvZ3JhcGh5LnN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4sXHJcbiAgICAgICAgICBuYW1lOiBlbnRpdHlJZCwgLy9JZGVudGlmaWVyIG9mIHRoZSB3b3JrZmxvdyBlbnRpdHkgKGkuZS4gJyQuZGV0YWlsLmlkJylcclxuICAgICAgICAgIGlucHV0OiB7XHJcbiAgICAgICAgICAgIGRldGFpbDogRXZlbnRGaWVsZC5mcm9tUGF0aCgnJC5kZXRhaWwnKSxcclxuICAgICAgICAgICAgZXZlbnROYW1lOiBFdmVudEZpZWxkLmZyb21QYXRoKCckLmRldGFpbC10eXBlJyksXHJcbiAgICAgICAgICAgIGVudGl0eUlkOiB0aGlzLmdldEVudGl0eUlkKGNob3Jlb2dyYXBoeS5zdGFydEV2ZW50KVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH0pXVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy9Sb3V0aW5nIHN1YnNlcXVlbnQgZXZlbnRzIHRvIHRyaWdnZXIgc3RhdGUgbWFjaGluZSB0cmFuc2l0aW9uXHJcbiAgICBuZXcgUnVsZSh0aGlzLCBgJHtjaG9yZW9ncmFwaHkubm9kZS5pZH1OZXh0RXZlbnRSdWxlYCwge1xyXG4gICAgICBldmVudEJ1czogdGhpcy5ldmVudEJ1cyxcclxuICAgICAgZXZlbnRQYXR0ZXJuOiBjaG9yZW9ncmFwaHkuZXZlbnRzWzBdLnBhdHRlcm4sXHJcbiAgICAgIHRhcmdldHM6IFtuZXcgTGFtYmRhRnVuY3Rpb24odGhpcy5ldmVudEhhbmRsZXJUYXNrLCB7XHJcbiAgICAgICAgZXZlbnQ6IFJ1bGVUYXJnZXRJbnB1dC5mcm9tT2JqZWN0KHtcclxuICAgICAgICAgIGRldGFpbDogRXZlbnRGaWVsZC5mcm9tUGF0aCgnJC5kZXRhaWwnKSxcclxuICAgICAgICAgIGV2ZW50TmFtZTogRXZlbnRGaWVsZC5mcm9tUGF0aCgnJC5kZXRhaWwtdHlwZScpLFxyXG4gICAgICAgICAgZW50aXR5SWQ6IHRoaXMuZ2V0RW50aXR5SWQoY2hvcmVvZ3JhcGh5LmV2ZW50c1swXSlcclxuICAgICAgICB9KVxyXG4gICAgICB9KV1cclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuY2hvcmVvZ3JhcGh5TGlzdC5wdXNoKGNob3Jlb2dyYXBoeSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMYW1iZGEgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIGV2ZW50cyBmcm9tIHRoZSBjdXN0b20gZXZlbnQgYnVzLFxyXG4gICAqIHJldHJpZXZlcyB0YXNrIHRva2VuIGJhc2VkIG9uIGVudGl0eUlkIGFuZCBldmVudCB0eXBlIGFuZCBmZWVkXHJcbiAgICogdGhlIHJlc3VsdCB0byBTdGVwIEZ1bmN0aW9ucyBjYWxsaW5nIFNlbmRUYXNrU3VjY2Vzcy5cclxuICAgKiBAcGFyYW0gdGFza1Rva2Vuc1RhYmxlIFxyXG4gICAqIEByZXR1cm5zIFxyXG4gICAqL1xyXG4gIHByaXZhdGUgZXZlbnRIYW5kbGVyRnVuY3Rpb24odGFza1Rva2Vuc1RhYmxlOlRhYmxlKTpJRnVuY3Rpb24ge1xyXG4gICAgY29uc3QgZXZlbnRIYW5kbGVyID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdFdmVudEhhbmRsZXInLCB7XHJcbiAgICAgIGVudHJ5OiBfX2Rpcm5hbWUgKyBcIi8uLi9yZXNvdXJjZXMvZXZlbnRfaGFuZGxlci9hcHAudHNcIiwgLy8gYWNjZXB0cyAuanMsIC5qc3gsIC50cyBhbmQgLnRzeCBmaWxlc1xyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEFTS19UT0tFTlNfVEFCTEVfTkFNRTogdGFza1Rva2Vuc1RhYmxlLnRhYmxlTmFtZVxyXG4gICAgICB9LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAyMCxcclxuICAgICAgcm9sZTogbmV3IFJvbGUodGhpcywgJ0N1c3RvbUV2ZW50SGFuZGxlckV4ZWN1dGlvblJvbGUnLCB7XHJcbiAgICAgICAgYXNzdW1lZEJ5OiBuZXcgU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgICBtYW5hZ2VkUG9saWNpZXM6IFsgdGhpcy5sYW1iZGFCYXNlRXhlY3V0aW9uUm9sZVBvbGljeSBdXHJcbiAgICAgIH0pLFxyXG4gICAgICByZXRyeUF0dGVtcHRzOiAyXHJcbiAgICB9KTtcclxuICAgIHRhc2tUb2tlbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZXZlbnRIYW5kbGVyKTtcclxuICAgIHJldHVybiBldmVudEhhbmRsZXI7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMYW1iZGEgZnVuY3Rpb24gdGhhdCBzdGFydCB0aGUgZXhlY3V0aW9uIG9mIHRoZSB3b3JrZmxvdyBzdGF0ZSBtYWNoaW5lXHJcbiAgICogQHBhcmFtIHRhc2tUb2tlbnNUYWJsZVxyXG4gICAqIEByZXR1cm5zIFxyXG4gICAqL1xyXG4gIHByaXZhdGUgaW5pdFdvcmtmbG93RnVuY3Rpb24odGFza1Rva2Vuc1RhYmxlOlRhYmxlKTogSUZ1bmN0aW9uIHtcclxuICAgIC8vSW5pdGlhbGl6ZSBXb3JrZmxvdyBGdW5jdGlvblxyXG4gICAgY29uc3QgaW5pdFdvcmtmbG93SGFuZGxlciA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCBcIkluaXRXb3JrZmxvd0hhbmRsZXJcIiwge1xyXG4gICAgICBlbnRyeTogX19kaXJuYW1lICsgXCIvLi4vcmVzb3VyY2VzL2luaXRpYWxpemVfd29ya2Zsb3cvYXBwLnRzXCIsIC8vIGFjY2VwdHMgLmpzLCAuanN4LCAudHMgYW5kIC50c3ggZmlsZXNcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRBU0tfVE9LRU5TX1RBQkxFX05BTUU6IHRhc2tUb2tlbnNUYWJsZS50YWJsZU5hbWVcclxuICAgICAgfSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogNSxcclxuICAgICAgcm9sZTogbmV3IFJvbGUodGhpcywgJ0N1c3RvbUluaXRXb3JrZmxvd0V4ZWN1dGlvblJvbGUnLCB7XHJcbiAgICAgICAgYXNzdW1lZEJ5OiBuZXcgU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgICBtYW5hZ2VkUG9saWNpZXM6IFsgdGhpcy5sYW1iZGFCYXNlRXhlY3V0aW9uUm9sZVBvbGljeSBdXHJcbiAgICAgIH0pLFxyXG4gICAgICByZXRyeUF0dGVtcHRzOiAyXHJcbiAgICB9KTtcclxuICAgIHRhc2tUb2tlbnNUYWJsZS5ncmFudFdyaXRlRGF0YShpbml0V29ya2Zsb3dIYW5kbGVyKTtcclxuICAgIHJldHVybiBpbml0V29ya2Zsb3dIYW5kbGVyO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBiYXNpY0xhbWJkYUV4ZWN1dGlvblJvbGVQb2xpY3koKTogTWFuYWdlZFBvbGljeSB7XHJcbiAgICByZXR1cm4gbmV3IE1hbmFnZWRQb2xpY3kodGhpcywgXCJDdXN0b21CYXNpY0xhbWJkYUV4ZWN1Y3Rpb25Sb2xlUG9saWN5XCIsIHtcclxuICAgICAgc3RhdGVtZW50czogW1xyXG4gICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgYWN0aW9uczogWyBcImxvZ3M6Q3JlYXRlTG9nR3JvdXBcIiwgXCJsb2dzOkNyZWF0ZUxvZ1N0cmVhbVwiLCBcImxvZ3M6UHV0TG9nRXZlbnRzXCJdLFxyXG4gICAgICAgICAgcmVzb3VyY2VzOiBbIGBhcm46YXdzOmxvZ3M6JHtTdGFjay5vZih0aGlzKS5yZWdpb259OiR7U3RhY2sub2YodGhpcykuYWNjb3VudH06bG9nLWdyb3VwOi9hd3MvbGFtYmRhLyR7U3RhY2sub2YodGhpcykuc3RhY2tOYW1lfSo6KmAgXVxyXG4gICAgICAgIH0pXHJcbiAgICAgIF1cclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldEVudGl0eUlkKGV2ZW50OiBDaG9yZW9ncmFwaHlFdmVudCk6IHN0cmluZyB7IFxyXG4gICAgY29uc3QgcGF0aCA9IGV2ZW50LmVudGl0eUlkSnNvblBhdGggPyBldmVudC5lbnRpdHlJZEpzb25QYXRoIDogJyQuZGV0YWlsLmlkJztcclxuICAgIHJldHVybiBFdmVudEZpZWxkLmZyb21QYXRoKHBhdGgpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdCB0aGF0IG1vZGVscyBhIGNob3Jlb2dyYXBoeSBkZWZpbml0aW9uIGFzIGEgU3RlcCBGdW5jdGlvbnMgc3RhdGUgbWFjaGluZS5cclxuICogSXQgY2hlY2tzIHRoYXQgdGhlIGRlZmluaXRpb24gcHJvdmlkZWQgaW4gdGhlIHByb3BlcnRpZXMgY29udGFpbnMgb25seSBhbGxvd2VkIFN0YXRlIHR5cGVzIChpLmUuIFRhc2sgc3RhdGVzIG11c3QgYmUgaW5zdGFuY2VvZiBDaG9yZW9ncmFwaHlTdGF0ZSlcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDaG9yZW9ncmFwaHkgZXh0ZW5kcyBjZGsuQ29uc3RydWN0IHtcclxuXHJcbiAgcHVibGljIHJlYWRvbmx5IHN0YXRlTWFjaGluZTogU3RhdGVNYWNoaW5lO1xyXG4gIHB1YmxpYyByZWFkb25seSBzdGFydEV2ZW50OiBDaG9yZW9ncmFwaHlFdmVudDtcclxuICBwdWJsaWMgcmVhZG9ubHkgZXZlbnRzOiBDaG9yZW9ncmFwaHlFdmVudFtdO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkNvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENob3Jlb2dyYXBoeVByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG4gICAgdGhpcy5jaGVja0RlZmluaXRpb24ocHJvcHMuZGVmaW5pdGlvbik7XHJcbiAgICB0aGlzLnN0YXJ0RXZlbnQgPSBwcm9wcy5zdGFydEV2ZW50O1xyXG4gICAgdGhpcy5ldmVudHMgPSBwcm9wcy5ldmVudHM7XHJcbiAgICB0aGlzLnN0YXRlTWFjaGluZSA9IG5ldyBTdGF0ZU1hY2hpbmUodGhpcywgXCJTdGF0ZU1hY2hpbmVcIiwge1xyXG4gICAgICBkZWZpbml0aW9uOiBwcm9wcy5kZWZpbml0aW9uLFxyXG4gICAgICBzdGF0ZU1hY2hpbmVUeXBlOiBTdGF0ZU1hY2hpbmVUeXBlLlNUQU5EQVJELFxyXG4gICAgICB0aW1lb3V0OiBwcm9wcy50aW1lb3V0XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY2hlY2tEZWZpbml0aW9uKGRlZmluaXRpb246IElDaGFpbmFibGUpIHtcclxuICAgIGNvbnN0IHN0YXRlczogU3RhdGVbXSA9IFN0YXRlLmZpbmRSZWFjaGFibGVTdGF0ZXMoZGVmaW5pdGlvbi5zdGFydFN0YXRlKTtcclxuICAgIHN0YXRlcy5mb3JFYWNoKHMgPT4ge1xyXG4gICAgICBpZigocyBpbnN0YW5jZW9mIFRhc2tTdGF0ZUJhc2UpICYmICEocyBpbnN0YW5jZW9mIENob3Jlb2dyYXBoeVN0YXRlKSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgU3RhdGUgJHtzLmlkfSBtdXN0IGJlIGFuIGluc3RhbmNlIG9mIGNsYXNzIENob3Jlb2dyYXBoeVN0YXRlLmApXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==