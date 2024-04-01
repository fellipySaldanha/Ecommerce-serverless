import * as cdk from "aws-cdk-lib"
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as cwlogs from "aws-cdk-lib/aws-logs"
import { Construct } from "constructs"

interface ECommerceApiStackProps extends cdk.StackProps {
    productsFetchHandler: lambdaNodeJS.NodejsFunction
    productsAdminHandler: lambdaNodeJS.NodejsFunction
 }

export class ECommerceApiStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
        super(scope, id, props)

        const logGroup = new cwlogs.LogGroup(this, "ECommerceApiLogs")
        const logProps: cdk.aws_apigateway.JsonWithStandardFieldProps = {
            httpMethod: true,
            ip: false,
            protocol: true,
            requestTime: true,
            resourcePath: true,
            responseLength: true,
            status: true,
            caller: true,
            user: false
        }
        const apiConfigure: cdk.aws_apigateway.RestApiProps = {
            restApiName: "ECommerceApi",
            cloudWatchRole: true,
            deployOptions: {
                accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(logProps)
            }
        }
        const api = new apigateway.RestApi(this, "ECommerceApi", apiConfigure)

        const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler)

        const productsResource = api.root.addResource("products")
        productsResource.addMethod("GET", productsFetchIntegration)

        const productIdResource = productsResource.addResource("{id}")
        productIdResource.addMethod("GET", productsFetchIntegration)

        const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler)

        productsResource.addMethod("POST", productsAdminIntegration)

        productIdResource.addMethod("PUT", productsAdminIntegration)

        productIdResource.addMethod("DELETE", productsAdminIntegration)
    }
}
