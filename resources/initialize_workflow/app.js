"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
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
// Function: initialize_workflow:app.js
const client_sfn_1 = require("@aws-sdk/client-sfn");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const sfn = new client_sfn_1.SFN({});
const dynamoDB = new client_dynamodb_1.DynamoDB({});
const taskTokenTableName = process.env.TASK_TOKENS_TABLE_NAME;
const handler = async (event) => {
    try {
        const execution = await sfn.startExecution({
            stateMachineArn: event.stateMachineArn,
            name: event.name,
            input: JSON.stringify(event.input)
        });
        if (!execution.executionArn) {
            throw new Error("ExecutionArn is undefined.");
        }
        const saveExecution = await dynamoDB.updateItem({
            TableName: taskTokenTableName,
            Key: {
                "entityId": { "S": event.name },
                "eventName": { "S": "Default" }
            },
            UpdateExpression: "SET executionArn = :execArn",
            ExpressionAttributeValues: {
                ":execArn": { "S": execution.executionArn }
            }
        });
        return {
            statusCode: 200,
            body: 'OK'
        };
    }
    catch (e) {
        console.error(`Error starting new execution for state machine ${event.stateMachineArn}. ${JSON.stringify(e.stack)}`);
        throw e;
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7Ozs7Ozs7Ozs7O0VBYUU7QUFDRixpQ0FBaUM7QUFDakMsdUNBQXVDO0FBQ3ZDLG9EQUEwQztBQUMxQyw4REFBb0Q7QUFFcEQsTUFBTSxHQUFHLEdBQUcsSUFBSSxnQkFBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3hCLE1BQU0sUUFBUSxHQUFHLElBQUksMEJBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVsQyxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUM7QUFFdkQsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQVUsRUFBZ0IsRUFBRTtJQUV4RCxJQUFJO1FBQ0YsTUFBTSxTQUFTLEdBQUcsTUFBTSxHQUFHLENBQUMsY0FBYyxDQUFDO1lBQ3pDLGVBQWUsRUFBRSxLQUFLLENBQUMsZUFBZTtZQUN0QyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztTQUNuQyxDQUFDLENBQUM7UUFDSCxJQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRTtZQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUE7U0FDOUM7UUFDRCxNQUFNLGFBQWEsR0FBRyxNQUFNLFFBQVEsQ0FBQyxVQUFVLENBQUM7WUFDOUMsU0FBUyxFQUFFLGtCQUFrQjtZQUM3QixHQUFHLEVBQUU7Z0JBQ0gsVUFBVSxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUU7Z0JBQy9CLFdBQVcsRUFBRSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUU7YUFDOUI7WUFDSCxnQkFBZ0IsRUFBRSw2QkFBNkI7WUFDL0MseUJBQXlCLEVBQUU7Z0JBQ3pCLFVBQVUsRUFBRSxFQUFFLEdBQUcsRUFBRSxTQUFTLENBQUMsWUFBWSxFQUFFO2FBQzVDO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsSUFBSSxFQUFFLElBQUk7U0FDWCxDQUFBO0tBQ0Y7SUFBQyxPQUFNLENBQUMsRUFBRTtRQUNULE9BQU8sQ0FBQyxLQUFLLENBQUMsa0RBQWtELEtBQUssQ0FBQyxlQUFlLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JILE1BQU0sQ0FBQyxDQUFDO0tBQ1Q7QUFDSCxDQUFDLENBQUE7QUE5QlksUUFBQSxPQUFPLFdBOEJuQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAgQ29weXJpZ2h0IDIwMjAgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cclxuICBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXNcclxuICBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmVcclxuICB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksXHJcbiAgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0b1xyXG4gIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzby5cclxuICBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SIElNUExJRUQsXHJcbiAgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEFcclxuICBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUXHJcbiAgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OXHJcbiAgT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFXHJcbiAgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXHJcbiovXHJcbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBNSVQtMFxyXG4vLyBGdW5jdGlvbjogaW5pdGlhbGl6ZV93b3JrZmxvdzphcHAuanNcclxuaW1wb3J0IHsgU0ZOIH0gZnJvbSBcIkBhd3Mtc2RrL2NsaWVudC1zZm5cIjtcclxuaW1wb3J0IHsgRHluYW1vREIgfSBmcm9tIFwiQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiXCI7XHJcblxyXG5jb25zdCBzZm4gPSBuZXcgU0ZOKHt9KTtcclxuY29uc3QgZHluYW1vREIgPSBuZXcgRHluYW1vREIoe30pO1xyXG5cclxuY29uc3QgdGFza1Rva2VuVGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuVEFTS19UT0tFTlNfVEFCTEVfTkFNRTtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBhbnkpOiBQcm9taXNlPGFueT4gPT4ge1xyXG4gICAgXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGV4ZWN1dGlvbiA9IGF3YWl0IHNmbi5zdGFydEV4ZWN1dGlvbih7XHJcbiAgICAgIHN0YXRlTWFjaGluZUFybjogZXZlbnQuc3RhdGVNYWNoaW5lQXJuLFxyXG4gICAgICBuYW1lOiBldmVudC5uYW1lLFxyXG4gICAgICBpbnB1dDogSlNPTi5zdHJpbmdpZnkoZXZlbnQuaW5wdXQpXHJcbiAgICB9KTtcclxuICAgIGlmKCFleGVjdXRpb24uZXhlY3V0aW9uQXJuKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4ZWN1dGlvbkFybiBpcyB1bmRlZmluZWQuXCIpXHJcbiAgICB9XHJcbiAgICBjb25zdCBzYXZlRXhlY3V0aW9uID0gYXdhaXQgZHluYW1vREIudXBkYXRlSXRlbSh7XHJcbiAgICAgIFRhYmxlTmFtZTogdGFza1Rva2VuVGFibGVOYW1lLFxyXG4gICAgICBLZXk6IHtcclxuICAgICAgICBcImVudGl0eUlkXCI6IHsgXCJTXCI6IGV2ZW50Lm5hbWUgfSxcclxuICAgICAgICBcImV2ZW50TmFtZVwiOiB7IFwiU1wiOiBcIkRlZmF1bHRcIiB9XHJcbiAgICAgICAgfSxcclxuICAgICAgVXBkYXRlRXhwcmVzc2lvbjogXCJTRVQgZXhlY3V0aW9uQXJuID0gOmV4ZWNBcm5cIixcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgIFwiOmV4ZWNBcm5cIjogeyBcIlNcIjogZXhlY3V0aW9uLmV4ZWN1dGlvbkFybiB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBib2R5OiAnT0snXHJcbiAgICB9XHJcbiAgfSBjYXRjaChlKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKGBFcnJvciBzdGFydGluZyBuZXcgZXhlY3V0aW9uIGZvciBzdGF0ZSBtYWNoaW5lICR7ZXZlbnQuc3RhdGVNYWNoaW5lQXJufS4gJHtKU09OLnN0cmluZ2lmeShlLnN0YWNrKX1gKTtcclxuICAgIHRocm93IGU7XHJcbiAgfSAgXHJcbn1cclxuIl19