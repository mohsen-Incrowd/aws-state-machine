import * as cdk from "constructs";
import { StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { EventBus } from "aws-cdk-lib/aws-events";
/**
 * Properties to initialize a workflow simulation state machine
 */
export interface WorkflowSimulationProps {
    /**
     * Event bus to use to put events.
     */
    eventBus: EventBus;
}
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
export declare class WorkflowSimulationStateMachine extends StateMachine {
    constructor(scope: cdk.Construct, id: string, props: WorkflowSimulationProps);
}
