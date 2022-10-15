import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IChainable } from "aws-cdk-lib/aws-stepfunctions";
import { ChoreographyStateBuilder } from './choreography-state';
export declare class ChoreographyInsightsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
    /**
     * Sample workflow #1 - Order processing for a marketplace, accepting requests and forwarding to service providers
     * 1. Order Placed: a new order has been placed. The state machine is waiting for the confermation
     * 2. Order Confirmed: the order has been confirmed by sending a request to the service provider. The state machine is waiting for the service provider to accept the order.
     * 3. Order Accepted: the service provider accepted the order. the state machine will wait for the order delivery aknowledgement
     * 4. Order Rejected: the service provider rejected the order. Marketplace should cancel the order. The state machine will wait for the Order Canceled event
     * 5. Order Canceled: The customer did not confirm the order or the service provider did not complete delivery. The state machine reach final state OrderCanceled.
     * 6. Order Delivered: When the service provider accept the order it proceeds with delivery and when it's done provide aknowledgement with an event. The state machine reach final state OrderCompleted.
     * @param builder
     * @returns
     */
    orderWorkflowDefinition(builder: ChoreographyStateBuilder): IChainable;
    /**
     * Sample workflow #2 - Car journey for a second hand car dealership
     * 1. Car Announcement: A supplier announce that a new car is available to be purchased from the dealer publishing a Car Announced event
     * 2. Inspection: The dealer perform an inspection on the car. At the end of the inspection a Inspection Completed event is published with the result (Success, Rejected)
     * 3. Preparation: When inspection is successful, the dealer buy the car from the supplier and prepare it for reselling it. The preparation involves 3 separate tasks
     *    3.1 Cleaning: Car is cleaned. At task completion, a Car Cleaned event is published
     *    3.2 Repairing: Eventual damages are repaired. At task completion, a Car Repaired event is published
     *    3.3 Evaluating: A reselling price is calculated for the car. At task completion, a Car Priced event is published
     * 4. Ready for Sale: The car is ready to be published to the selling channel
     * 5. On Sale: A Car Published event indicates that the car is advertized on sales channels (i.e. ecommerce, apps, etc).
     *    5.1 The car can also be removed from adv channels. This is aknowledged with a Car Unpublished event. This cause the transition back to the Ready for Sale state.
     * 6. Reserved: A Car Reserved event published on the bus indicates that the someone is interested in the car and the purchasing process is in progress.
     *    6.1 If purchasing is canceled, a Car Unreserved event is published which brings the workflow to the On Sale state
     * 7. Sold: Purchase is completed and a Car Sold event is published. When the car is sold 2 things need to happen:
     *    7.1 The dealer generate an invoice and send it to the buyer. At task completion, a Car Invoiced event is published
     *    7.2 The dealer deliver the car to the buyer. At task completion, a Car Invoiced event is published
     * @param builder
     * @returns
     */
    carWorkflowDefinition(builder: ChoreographyStateBuilder): IChainable;
}
