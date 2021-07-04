import * as cdk from "aws-cdk-lib";
import * as ContactTracing from "../lib/contact-tracing-stack";

test("Empty Stack", () => {
  const app = new cdk.App();
  // WHEN
  const stack = new ContactTracing.ContactTracingStack(app, "MyTestStack");
  // THEN
  const actual = app.synth().getStackArtifact(stack.artifactId).template;
  expect(actual.Resources ?? {}).toEqual({});
});
