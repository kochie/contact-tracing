module github.com/kochie/contact-tracing/lib/functions

go 1.16

require (
	github.com/aws/aws-dax-go v0.0.0-00010101000000-000000000000
	github.com/aws/aws-lambda-go v1.24.0
	github.com/aws/aws-sdk-go-v2 v1.6.0
	github.com/aws/aws-sdk-go-v2/config v1.3.0
	github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue v1.1.1
	github.com/aws/aws-sdk-go-v2/service/dynamodb v1.3.1
	github.com/aws/aws-xray-sdk-go v1.4.0
)

replace (
	github.com/aws/aws-dax-go => github.com/kochie/aws-dax-go v1.2.8-0.20210606022114-926ae2149af1
	github.com/aws/aws-xray-sdk-go v1.4.0 => github.com/srprash/aws-xray-sdk-go v1.3.1-0.20210429221006-b3c0ea52a83b
)
