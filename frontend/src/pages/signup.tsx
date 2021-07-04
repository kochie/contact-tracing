import React, { useState } from "react";
import { Auth } from "aws-amplify";
import Link from "next/link";
import { Formik } from "formik";

const SignUp = () => {
  const [email, setEmail] = useState("");

  return (
    <div className="w-screen h-screen dark:bg-gray-600 bg-white flex flex-col justify-center">
      <div className="w-96 p-12 m-auto shadow-lg rounded-md bg-gray-200">
        {!email ? (
          <Formik
            initialValues={{
              email: "",
              password: "",
            }}
            onSubmit={async (values, { setSubmitting, setErrors }) => {
              try {
                const user = await Auth.signUp({
                  username: values.email,
                  password: values.password,
                  attributes: {
                    email: values.email,
                  },
                });
                // console.log(user);
                setEmail(values.email);
              } catch (error) {
                console.log("error signing in", error);
                setErrors({ email: error?.message || "" });
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
                    htmlFor="username"
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
                  <div className="text-sm text-red-600 mt-2">
                    {errors.email && touched.email && errors.email}
                  </div>
                </div>
                <div className="my-2 inline-block w-full">
                  <label
                    htmlFor="password"
                    className="mb-2 text-sm font-bold block"
                  >
                    Password
                  </label>
                  <input
                    className="shadow-md rounded-lg p-2 border-black border-1 focus:border-blue-400 focus:border-2 block w-full"
                    type="password"
                    value={values.password}
                    name="password"
                    id="password"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={"Password"}
                  />
                </div>
                <div className="mt-8 inline-block w-full">
                  <input
                    type="submit"
                    value="Sign Up"
                    className="w-full rounded bg-green-300 text-white text-center font-bold py-1 cursor-pointer hover:bg-green-400 transform-gpu duration-200 border-2 border-green-500 active:bg-green-700"
                  />
                </div>
              </form>
            )}
          </Formik>
        ) : (
          <div>
            <p>
              A verification code has been sent to your email. Please enter the
              code on the verification page.
            </p>
            <div className="mt-5">
              <Link href={`/confirm_signup?email=${email}`}>
                <input
                  type="submit"
                  value="Verify"
                  className="w-full rounded bg-green-300 text-white text-center font-bold py-1 cursor-pointer hover:bg-green-400 transform-gpu duration-200 border-2 border-green-500 active:bg-green-700"
                />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignUp;
