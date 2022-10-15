"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChoreographyStateBuilder = exports.ChoreographyState = void 0;
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
const aws_stepfunctions_tasks_1 = require("aws-cdk-lib/aws-stepfunctions-tasks");
const aws_stepfunctions_1 = require("aws-cdk-lib/aws-stepfunctions");
/**
 * Define a Choreography State.
 */
class ChoreographyState extends aws_stepfunctions_tasks_1.CallAwsService {
    constructor(scope, builder) {
        super(scope, builder.name, {
            service: 'dynamodb',
            action: 'updateItem.waitForTaskToken',
            parameters: {
                TableName: builder.taskTokenTable.tableName,
                Key: {
                    entityId: {
                        "S": builder.entityId
                    },
                    eventName: {
                        "S": builder.eventName
                    }
                },
                UpdateExpression: "SET taskToken = :token",
                ExpressionAttributeValues: {
                    ":token": { "S": aws_stepfunctions_1.JsonPath.taskToken }
                }
            },
            iamResources: [builder.taskTokenTable.tableArn],
            iamAction: "dynamodb:updateItem",
        });
        this.addRetry();
    }
}
exports.ChoreographyState = ChoreographyState;
/**
 * Builder class for Choreography States.
 */
class ChoreographyStateBuilder extends cdk.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this._entityId = aws_stepfunctions_1.JsonPath.stringAt("$$.Execution.Input.detail.id");
        this._eventName = "Default";
        this._scope = scope;
        this._taskTokenTable = props.taskTokenTable;
    }
    reset() {
        this._entityId = aws_stepfunctions_1.JsonPath.stringAt("$$.Execution.Input.detail.id");
        this._eventName = "Default";
    }
    withName(name) {
        this._name = name;
        return this;
    }
    withEntityId(entityId) {
        this._entityId = entityId;
        return this;
    }
    withEventName(eventName) {
        this._eventName = eventName;
        return this;
    }
    get name() {
        return this._name;
    }
    get entityId() {
        return this._entityId;
    }
    get eventName() {
        return this._eventName;
    }
    get taskTokenTable() {
        return this._taskTokenTable;
    }
    build() {
        const state = new ChoreographyState(this._scope, this);
        this.reset();
        return state;
    }
}
exports.ChoreographyStateBuilder = ChoreographyStateBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hvcmVvZ3JhcGh5LXN0YXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2hvcmVvZ3JhcGh5LXN0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7Ozs7Ozs7Ozs7O0VBYUU7QUFDRixpQ0FBaUM7QUFDakMsa0NBQWtDO0FBRWxDLGlGQUFxRTtBQUNyRSxxRUFBeUQ7QUFpQnpEOztHQUVHO0FBQ0gsTUFBYSxpQkFBa0IsU0FBUSx3Q0FBYztJQUtuRCxZQUFZLEtBQW9CLEVBQUUsT0FBaUM7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ3pCLE9BQU8sRUFBRSxVQUFVO1lBQ25CLE1BQU0sRUFBRSw2QkFBNkI7WUFDckMsVUFBVSxFQUFFO2dCQUNWLFNBQVMsRUFBRSxPQUFPLENBQUMsY0FBYyxDQUFDLFNBQVM7Z0JBQzNDLEdBQUcsRUFBRTtvQkFDSCxRQUFRLEVBQUU7d0JBQ1IsR0FBRyxFQUFFLE9BQU8sQ0FBQyxRQUFRO3FCQUN0QjtvQkFDRCxTQUFTLEVBQUU7d0JBQ1QsR0FBRyxFQUFFLE9BQU8sQ0FBQyxTQUFTO3FCQUN2QjtpQkFDRjtnQkFDRCxnQkFBZ0IsRUFBRSx3QkFBd0I7Z0JBQzFDLHlCQUF5QixFQUFFO29CQUN6QixRQUFRLEVBQUUsRUFBRSxHQUFHLEVBQUUsNEJBQVEsQ0FBQyxTQUFTLEVBQUU7aUJBQ3RDO2FBQ0Y7WUFDRCxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztZQUMvQyxTQUFTLEVBQUUscUJBQXFCO1NBQ2pDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQixDQUFDO0NBQ0Y7QUE3QkQsOENBNkJDO0FBRUQ7O0dBRUc7QUFDSCxNQUFhLHdCQUF5QixTQUFRLEdBQUcsQ0FBQyxTQUFTO0lBT3pELFlBQVksS0FBb0IsRUFBRSxFQUFVLEVBQUUsS0FBb0M7UUFDaEYsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUpYLGNBQVMsR0FBVyw0QkFBUSxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQ3RFLGVBQVUsR0FBVyxTQUFTLENBQUM7UUFJckMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDO0lBQzlDLENBQUM7SUFFTyxLQUFLO1FBQ1gsSUFBSSxDQUFDLFNBQVMsR0FBRyw0QkFBUSxDQUFDLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO0lBQzdCLENBQUM7SUFFRCxRQUFRLENBQUMsSUFBWTtRQUNuQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNsQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxZQUFZLENBQUMsUUFBZ0I7UUFDM0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFDMUIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsYUFBYSxDQUFDLFNBQWlCO1FBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQzVCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELElBQUksSUFBSTtRQUNOLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUNwQixDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDekIsQ0FBQztJQUVELElBQUksY0FBYztRQUNoQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDOUIsQ0FBQztJQUVELEtBQUs7UUFDSCxNQUFNLEtBQUssR0FBRyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2IsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0NBQ0Y7QUF0REQsNERBc0RDIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICBDb3B5cmlnaHQgMjAyMCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxyXG4gIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpc1xyXG4gIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZVxyXG4gIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSxcclxuICBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvXHJcbiAgcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLlxyXG4gIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1IgSU1QTElFRCxcclxuICBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQVxyXG4gIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFRcclxuICBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT05cclxuICBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEVcclxuICBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cclxuKi9cclxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IE1JVC0wXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tIFwiY29uc3RydWN0c1wiO1xyXG5pbXBvcnQgeyBUYWJsZSB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGJcIjtcclxuaW1wb3J0IHsgQ2FsbEF3c1NlcnZpY2UgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3NcIjtcclxuaW1wb3J0IHsgSnNvblBhdGggfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnNcIjtcclxuXHJcbi8qKlxyXG4gKiBQcm9wZXJ0aWVzIHRvIGluaXRpYWxpemUgYSBDaG9yZW9ncmFwaHlTdGF0ZUJ1aWxkZXJcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ2hvcmVvZ3JhcGh5U3RhdGVCdWlsZGVyUHJvcHMge1xyXG4gIC8qKlxyXG4gICAqIFRhYmxlIHRvIHN0b3JlIFN0ZXAgRnVuY3Rpb25zIFRhc2sgVG9rZW5zXHJcbiAgICovXHJcbiAgdGFza1Rva2VuVGFibGU6IFRhYmxlO1xyXG4gIC8qKlxyXG4gICAqIEpzb24gUGF0aCBmcm9tIHdoZXJlIHRvIHJldHJpZXZlIHRoZSBjb3JyZWxhdGlvbiBpZFxyXG4gICAqIEBkZWZhdWx0IC0gJCQuRXhlY3V0aW9uLklucHV0LmRldGFpbC5pZFxyXG4gICAqL1xyXG4gIGVudGl0eUlkPzogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogRGVmaW5lIGEgQ2hvcmVvZ3JhcGh5IFN0YXRlLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENob3Jlb2dyYXBoeVN0YXRlIGV4dGVuZHMgQ2FsbEF3c1NlcnZpY2Uge1xyXG4gIG5hbWU6IHN0cmluZztcclxuICBlbnRpdHlJZDogc3RyaW5nO1xyXG4gIGV2ZW50TmFtZTogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkNvbnN0cnVjdCwgYnVpbGRlcjogQ2hvcmVvZ3JhcGh5U3RhdGVCdWlsZGVyKSB7XHJcbiAgICBzdXBlcihzY29wZSwgYnVpbGRlci5uYW1lLCB7XHJcbiAgICAgIHNlcnZpY2U6ICdkeW5hbW9kYicsXHJcbiAgICAgIGFjdGlvbjogJ3VwZGF0ZUl0ZW0ud2FpdEZvclRhc2tUb2tlbicsXHJcbiAgICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgICBUYWJsZU5hbWU6IGJ1aWxkZXIudGFza1Rva2VuVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEtleToge1xyXG4gICAgICAgICAgZW50aXR5SWQ6IHtcclxuICAgICAgICAgICAgXCJTXCI6IGJ1aWxkZXIuZW50aXR5SWRcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBldmVudE5hbWU6IHtcclxuICAgICAgICAgICAgXCJTXCI6IGJ1aWxkZXIuZXZlbnROYW1lXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiBcIlNFVCB0YXNrVG9rZW4gPSA6dG9rZW5cIixcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICBcIjp0b2tlblwiOiB7IFwiU1wiOiBKc29uUGF0aC50YXNrVG9rZW4gfVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgaWFtUmVzb3VyY2VzOiBbYnVpbGRlci50YXNrVG9rZW5UYWJsZS50YWJsZUFybl0sXHJcbiAgICAgIGlhbUFjdGlvbjogXCJkeW5hbW9kYjp1cGRhdGVJdGVtXCIsXHJcbiAgICB9KTtcclxuICAgIHRoaXMuYWRkUmV0cnkoKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCdWlsZGVyIGNsYXNzIGZvciBDaG9yZW9ncmFwaHkgU3RhdGVzLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENob3Jlb2dyYXBoeVN0YXRlQnVpbGRlciBleHRlbmRzIGNkay5Db25zdHJ1Y3Qge1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgX3Rhc2tUb2tlblRhYmxlOiBUYWJsZTtcclxuICBwcml2YXRlIHJlYWRvbmx5IF9zY29wZTogY2RrLkNvbnN0cnVjdDtcclxuICBwcml2YXRlIF9uYW1lOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBfZW50aXR5SWQ6IHN0cmluZyA9IEpzb25QYXRoLnN0cmluZ0F0KFwiJCQuRXhlY3V0aW9uLklucHV0LmRldGFpbC5pZFwiKTtcclxuICBwcml2YXRlIF9ldmVudE5hbWU6IHN0cmluZyA9IFwiRGVmYXVsdFwiO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkNvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENob3Jlb2dyYXBoeVN0YXRlQnVpbGRlclByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG4gICAgdGhpcy5fc2NvcGUgPSBzY29wZTtcclxuICAgIHRoaXMuX3Rhc2tUb2tlblRhYmxlID0gcHJvcHMudGFza1Rva2VuVGFibGU7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlc2V0KCkge1xyXG4gICAgdGhpcy5fZW50aXR5SWQgPSBKc29uUGF0aC5zdHJpbmdBdChcIiQkLkV4ZWN1dGlvbi5JbnB1dC5kZXRhaWwuaWRcIik7XHJcbiAgICB0aGlzLl9ldmVudE5hbWUgPSBcIkRlZmF1bHRcIlxyXG4gIH1cclxuXHJcbiAgd2l0aE5hbWUobmFtZTogc3RyaW5nKTogQ2hvcmVvZ3JhcGh5U3RhdGVCdWlsZGVyIHtcclxuICAgIHRoaXMuX25hbWUgPSBuYW1lO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICB3aXRoRW50aXR5SWQoZW50aXR5SWQ6IHN0cmluZyk6IENob3Jlb2dyYXBoeVN0YXRlQnVpbGRlciB7XHJcbiAgICB0aGlzLl9lbnRpdHlJZCA9IGVudGl0eUlkO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICB3aXRoRXZlbnROYW1lKGV2ZW50TmFtZTogc3RyaW5nKSB7XHJcbiAgICB0aGlzLl9ldmVudE5hbWUgPSBldmVudE5hbWU7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGdldCBuYW1lKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX25hbWU7XHJcbiAgfVxyXG5cclxuICBnZXQgZW50aXR5SWQoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fZW50aXR5SWQ7XHJcbiAgfVxyXG5cclxuICBnZXQgZXZlbnROYW1lKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX2V2ZW50TmFtZTtcclxuICB9XHJcblxyXG4gIGdldCB0YXNrVG9rZW5UYWJsZSgpIHtcclxuICAgIHJldHVybiB0aGlzLl90YXNrVG9rZW5UYWJsZTtcclxuICB9XHJcbiAgXHJcbiAgYnVpbGQoKSB7XHJcbiAgICBjb25zdCBzdGF0ZSA9IG5ldyBDaG9yZW9ncmFwaHlTdGF0ZSh0aGlzLl9zY29wZSwgdGhpcyk7XHJcbiAgICB0aGlzLnJlc2V0KCk7XHJcbiAgICByZXR1cm4gc3RhdGU7XHJcbiAgfVxyXG59Il19