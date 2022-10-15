import * as cdk from "constructs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { CallAwsService } from "aws-cdk-lib/aws-stepfunctions-tasks";
/**
 * Properties to initialize a ChoreographyStateBuilder
 */
export interface ChoreographyStateBuilderProps {
    /**
     * Table to store Step Functions Task Tokens
     */
    taskTokenTable: Table;
    /**
     * Json Path from where to retrieve the correlation id
     * @default - $$.Execution.Input.detail.id
     */
    entityId?: string;
}
/**
 * Define a Choreography State.
 */
export declare class ChoreographyState extends CallAwsService {
    name: string;
    entityId: string;
    eventName: string;
    constructor(scope: cdk.Construct, builder: ChoreographyStateBuilder);
}
/**
 * Builder class for Choreography States.
 */
export declare class ChoreographyStateBuilder extends cdk.Construct {
    private readonly _taskTokenTable;
    private readonly _scope;
    private _name;
    private _entityId;
    private _eventName;
    constructor(scope: cdk.Construct, id: string, props: ChoreographyStateBuilderProps);
    private reset;
    withName(name: string): ChoreographyStateBuilder;
    withEntityId(entityId: string): ChoreographyStateBuilder;
    withEventName(eventName: string): this;
    get name(): string;
    get entityId(): string;
    get eventName(): string;
    get taskTokenTable(): Table;
    build(): ChoreographyState;
}
