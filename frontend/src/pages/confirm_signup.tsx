import { useRouter } from "next/router";
import { Formik } from "formik";
import { Auth } from "aws-amplify";
import React from "react";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";

const Confirm = ({
  email,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter();

  return (
    <div className="w-screen h-screen bg-white flex flex-col justify-center">
      <div className="w-96 p-12 m-auto shadow-lg rounded-md bg-gray-200">
        <Formik
          initialValues={{
            email,
            code: "",
          }}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              const user = await Auth.confirmSignUp(values.email, values.code);

              console.log(user);
              await router.push(`/login?email=${values.email}`);
            } catch (error) {
              console.log("error signing in", error);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting,
          }) => (
            <form onSubmit={handleSubmit}>
              <div className="my-2 inline-block w-full">
                <label
                  htmlFor="email"
                  className="mb-2 text-sm font-bold block"
                >
                  Email
                </label>
                <input
                  className="shadow-md rounded-lg p-2 border-black border-1 focus:border-blue-400 focus:border-2 block w-full"
                  type="email"
                  value={values.email}
                  name="email"
                  id="email"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={"Enter Email"}
                />
              </div>
              <div className="my-2 inline-block w-full">
                <label
                  htmlFor="password"
                  className="mb-2 text-sm font-bold block"
                >
                  Code
                </label>
                <input
                  className="shadow-md rounded-lg p-2 border-black border-1 focus:border-blue-400 focus:border-2 block w-full"
                  type="text"
                  value={values.code}
                  name="code"
                  id="code"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder={"Code"}
                />
              </div>
              <div className="mt-8 inline-block w-full">
                <input
                  type="submit"
                  value="Confirm SignUp"
                  className="w-full rounded bg-green-300 text-white text-center font-bold py-1 cursor-pointer hover:bg-green-400 transform-gpu duration-200 border-2 border-green-500 active:bg-green-700"
                />
              </div>
            </form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: { email: context.query["email"] || "" }
  };
};

export default Confirm;
