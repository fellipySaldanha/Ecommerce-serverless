//https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda-readme.html
import * as lambda from "aws-cdk-lib/aws-lambda"

//https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"

//https://docs.aws.amazon.com/cdk/api/v2/docs/aws-construct-library.html
import * as cdk from "aws-cdk-lib"

import { Construct } from "constructs"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import * as ssm from "aws-cdk-lib/aws-ssm"

export class ProductsAppStack extends cdk.Stack {
    readonly productsFetchHandler: lambdaNodeJS.NodejsFunction
    readonly productsAdminHandler: lambdaNodeJS.NodejsFunction
    readonly productsDdb: dynamodb.Table
    
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        this.productsDdb = new dynamodb.Table(this, "ProductsDdb", {
            tableName: "products",
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            partitionKey: {
               name: "id",
               type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PROVISIONED,
            readCapacity: 1,
            writeCapacity: 1
        })
   
        const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, "ProductsLayerVersionArn")
        const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn)

        const functionProps:lambdaNodeJS.NodejsFunctionProps = this.buildProps(
            productsLayer,
            "lambda/products/productsFetchFunction.ts",
            "ProductsFetchFunction"
        );

        this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(
            this,
            "ProductsFetchFunction",
            functionProps
        )

        this.productsDdb.grantReadData(this.productsFetchHandler)

        const functionAdminProps:lambdaNodeJS.NodejsFunctionProps = this.buildProps(
            productsLayer,
            "lambda/products/productsAdminFunction.ts",
            "ProductsAdminFunction"
        );

        this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(
            this, 
            "ProductsAdminFunction", 
            functionAdminProps
        ) 
        this.productsDdb.grantWriteData(this.productsAdminHandler)
    }

    private buildProps(layer:lambda.ILayerVersion, entryPathFile:string, functionName:string):lambdaNodeJS.NodejsFunctionProps{
        return {
            functionName: functionName,
            entry: entryPathFile,
            handler: "handler",
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                minify: true,
                sourceMap: false
            },
            environment: {
                PRODUCTS_DDB: this.productsDdb.tableName
             }, 
             layers: [layer],
            runtime: lambda.Runtime.NODEJS_20_X
        }
    }
}