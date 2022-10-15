import * as cdk from "constructs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { StateMachine, IChainable } from "aws-cdk-lib/aws-stepfunctions";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { EventPattern, EventBus } from 'aws-cdk-lib/aws-events';
import { ChoreographyStateBuilder } from "./choreography-state";
import { Duration } from "aws-cdk-lib";
export interface ChoreographyInsightsProps {
    eventBus: EventBus;
    /**
     * How long, in days, the log contents will be retained.
     *
     * To retain all logs, set this value to RetentionDays.INFINITE.
     *
     * @default RetentionDays.ONE_YEAR
     * @stability stable
     */
    logRetention?: RetentionDays;
}
export interface ChoreographyProps {
    definition: IChainable;
    startEvent: ChoreographyEvent;
    events: ChoreographyEvent[];
    timeout?: Duration;
}
export interface ChoreographyEvent {
    pattern: EventPattern;
    entityIdJsonPath?: string;
}
/**
 * Construct to provision core resources to support choreography monitoring with Step Functions.
 * The Construct provision the following resources:
 * - A DynamoDB Table to store Task Tokens
 * - A Lambda function to start a new Step Functions state machine execution with an explicit name
 * - A lambda function to handle events by reading a Task Token from DynamoDB and invoking Step Functions SendTaskSuccess to resume execution
 * The Construct allows to monitor multiple Choreographies
 */
export declare class ChoreographyInsights extends cdk.Construct {
    readonly taskTokensTable: Table;
    readonly defaultStateBuilder: ChoreographyStateBuilder;
    private readonly eventHandlerTask;
    private readonly initWorkflowTask;
    private eventBus;
    private choreographyList;
    private readonly logRetention;
    private readonly lambdaBaseExecutionRolePolicy;
    private readonly logRetentionExecutionRolePolicy;
    constructor(scope: cdk.Construct, id: string, props?: ChoreographyInsightsProps);
    /**
     * Bind the choreography provided as input to the resources provisioned by the ChoreographyInsights construct.
     * It adds relevant permission to interact with the Choreography State Machine and creates 2 EventBridge rules
     * to match the initial event and subsequent events that belongs to the choreography
     * @param choreography
     */
    addChoreography(choreography: Choreography): void;
    /**
     * Lambda function that handles events from the custom event bus,
     * retrieves task token based on entityId and event type and feed
     * the result to Step Functions calling SendTaskSuccess.
     * @param taskTokensTable
     * @returns
     */
    private eventHandlerFunction;
    /**
     * Lambda function that start the execution of the workflow state machine
     * @param taskTokensTable
     * @returns
     */
    private initWorkflowFunction;
    private basicLambdaExecutionRolePolicy;
    private getEntityId;
}
/**
 * Construct that models a choreography definition as a Step Functions state machine.
 * It checks that the definition provided in the properties contains only allowed State types (i.e. Task states must be instanceof ChoreographyState)
 */
export declare class Choreography extends cdk.Construct {
    readonly stateMachine: StateMachine;
    readonly startEvent: ChoreographyEvent;
    readonly events: ChoreographyEvent[];
    constructor(scope: cdk.Construct, id: string, props: ChoreographyProps);
    private checkDefinition;
}
