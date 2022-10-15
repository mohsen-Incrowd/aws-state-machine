"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowSimulationStateMachine = void 0;
const aws_stepfunctions_1 = require("aws-cdk-lib/aws-stepfunctions");
const aws_stepfunctions_tasks_1 = require("aws-cdk-lib/aws-stepfunctions-tasks");
/**
 * State machine that simulate choreographies by publishing events to EventBridge with scheduled delays.
 * The State machine accepts a list of events as input. Each event should have the following structure:
 * {
 *   "source": "<Source of event>"
 *   "detailType": "<Type of event>",
 *   "detail": {...}
 *   "wait": <Seconds to wait before publishing next event>
 * }
 */
class WorkflowSimulationStateMachine extends aws_stepfunctions_1.StateMachine {
    constructor(scope, id, props) {
        super(scope, id, {
            definition: new aws_stepfunctions_1.Map(scope, "Map", {
                itemsPath: '$.events',
                maxConcurrency: 1,
                parameters: {
                    "event.$": "$$.Map.Item.Value",
                }
            }).iterator(new aws_stepfunctions_tasks_1.EventBridgePutEvents(scope, "PublishEvent", {
                entries: [
                    {
                        source: aws_stepfunctions_1.JsonPath.stringAt("$.event.source"),
                        detailType: aws_stepfunctions_1.JsonPath.stringAt("$.event.detailType"),
                        eventBus: props.eventBus,
                        detail: aws_stepfunctions_1.TaskInput.fromJsonPathAt('$.event.detail')
                    }
                ],
                resultPath: '$.eventResult'
            }).next(new aws_stepfunctions_1.Wait(scope, "Wait", { time: aws_stepfunctions_1.WaitTime.secondsPath('$.event.wait') })))
        });
    }
}
exports.WorkflowSimulationStateMachine = WorkflowSimulationStateMachine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2Zsb3ctc2ltdWxhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndvcmtmbG93LXNpbXVsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBZ0JBLHFFQUF1RztBQUV2RyxpRkFBMkU7QUFXM0U7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBYSw4QkFBK0IsU0FBUSxnQ0FBWTtJQUU5RCxZQUFZLEtBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQThCO1FBQzFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQ2YsVUFBVSxFQUFFLElBQUksdUJBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFO2dCQUNoQyxTQUFTLEVBQUUsVUFBVTtnQkFDckIsY0FBYyxFQUFFLENBQUM7Z0JBQ2pCLFVBQVUsRUFBRTtvQkFDVixTQUFTLEVBQUUsbUJBQW1CO2lCQUMvQjthQUNGLENBQUMsQ0FBQyxRQUFRLENBQ1QsSUFBSSw4Q0FBb0IsQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFO2dCQUM5QyxPQUFPLEVBQUU7b0JBQ1A7d0JBQ0UsTUFBTSxFQUFFLDRCQUFRLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDO3dCQUMzQyxVQUFVLEVBQUUsNEJBQVEsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUM7d0JBQ25ELFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUTt3QkFDeEIsTUFBTSxFQUFFLDZCQUFTLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDO3FCQUNuRDtpQkFDRjtnQkFDRCxVQUFVLEVBQUUsZUFBZTthQUM1QixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksd0JBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLDRCQUFRLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUNoRjtTQUNGLENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FFRjtBQTFCRCx3RUEwQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gIENvcHlyaWdodCAyMDIwIEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXHJcbiAgUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZiB0aGlzXHJcbiAgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlXHJcbiAgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LFxyXG4gIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG9cclxuICBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28uXHJcbiAgVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUiBJTVBMSUVELFxyXG4gIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBXHJcbiAgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVFxyXG4gIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTlxyXG4gIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRVxyXG4gIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxyXG4qL1xyXG4vLyBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogTUlULTBcclxuaW1wb3J0ICogYXMgY2RrIGZyb20gXCJjb25zdHJ1Y3RzXCJcclxuaW1wb3J0IHsgU3RhdGVNYWNoaW5lLCBNYXAsIEpzb25QYXRoLCBUYXNrSW5wdXQsIFdhaXQsIFdhaXRUaW1lIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zXCI7XHJcbmltcG9ydCB7IEV2ZW50QnVzIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1ldmVudHNcIjtcclxuaW1wb3J0IHsgRXZlbnRCcmlkZ2VQdXRFdmVudHMgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3NcIjtcclxuXHJcbi8qKlxyXG4gKiBQcm9wZXJ0aWVzIHRvIGluaXRpYWxpemUgYSB3b3JrZmxvdyBzaW11bGF0aW9uIHN0YXRlIG1hY2hpbmVcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgV29ya2Zsb3dTaW11bGF0aW9uUHJvcHMge1xyXG4gIC8qKlxyXG4gICAqIEV2ZW50IGJ1cyB0byB1c2UgdG8gcHV0IGV2ZW50cy5cclxuICAgKi9cclxuICBldmVudEJ1czogRXZlbnRCdXNcclxufVxyXG4vKipcclxuICogU3RhdGUgbWFjaGluZSB0aGF0IHNpbXVsYXRlIGNob3Jlb2dyYXBoaWVzIGJ5IHB1Ymxpc2hpbmcgZXZlbnRzIHRvIEV2ZW50QnJpZGdlIHdpdGggc2NoZWR1bGVkIGRlbGF5cy5cclxuICogVGhlIFN0YXRlIG1hY2hpbmUgYWNjZXB0cyBhIGxpc3Qgb2YgZXZlbnRzIGFzIGlucHV0LiBFYWNoIGV2ZW50IHNob3VsZCBoYXZlIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlOlxyXG4gKiB7XHJcbiAqICAgXCJzb3VyY2VcIjogXCI8U291cmNlIG9mIGV2ZW50PlwiXHJcbiAqICAgXCJkZXRhaWxUeXBlXCI6IFwiPFR5cGUgb2YgZXZlbnQ+XCIsXHJcbiAqICAgXCJkZXRhaWxcIjogey4uLn1cclxuICogICBcIndhaXRcIjogPFNlY29uZHMgdG8gd2FpdCBiZWZvcmUgcHVibGlzaGluZyBuZXh0IGV2ZW50PlxyXG4gKiB9XHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgV29ya2Zsb3dTaW11bGF0aW9uU3RhdGVNYWNoaW5lIGV4dGVuZHMgU3RhdGVNYWNoaW5lIHtcclxuICBcclxuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkNvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFdvcmtmbG93U2ltdWxhdGlvblByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHtcclxuICAgICAgZGVmaW5pdGlvbjogbmV3IE1hcChzY29wZSwgXCJNYXBcIiwge1xyXG4gICAgICAgIGl0ZW1zUGF0aDogJyQuZXZlbnRzJyxcclxuICAgICAgICBtYXhDb25jdXJyZW5jeTogMSxcclxuICAgICAgICBwYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICBcImV2ZW50LiRcIjogXCIkJC5NYXAuSXRlbS5WYWx1ZVwiLFxyXG4gICAgICAgIH1cclxuICAgICAgfSkuaXRlcmF0b3IoXHJcbiAgICAgICAgbmV3IEV2ZW50QnJpZGdlUHV0RXZlbnRzKHNjb3BlLCBcIlB1Ymxpc2hFdmVudFwiLCB7XHJcbiAgICAgICAgICBlbnRyaWVzOiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzb3VyY2U6IEpzb25QYXRoLnN0cmluZ0F0KFwiJC5ldmVudC5zb3VyY2VcIiksXHJcbiAgICAgICAgICAgICAgZGV0YWlsVHlwZTogSnNvblBhdGguc3RyaW5nQXQoXCIkLmV2ZW50LmRldGFpbFR5cGVcIiksXHJcbiAgICAgICAgICAgICAgZXZlbnRCdXM6IHByb3BzLmV2ZW50QnVzLFxyXG4gICAgICAgICAgICAgIGRldGFpbDogVGFza0lucHV0LmZyb21Kc29uUGF0aEF0KCckLmV2ZW50LmRldGFpbCcpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICByZXN1bHRQYXRoOiAnJC5ldmVudFJlc3VsdCdcclxuICAgICAgICB9KS5uZXh0KG5ldyBXYWl0KHNjb3BlLCBcIldhaXRcIiwgeyB0aW1lOiBXYWl0VGltZS5zZWNvbmRzUGF0aCgnJC5ldmVudC53YWl0Jyl9KSlcclxuICAgICAgKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG59Il19