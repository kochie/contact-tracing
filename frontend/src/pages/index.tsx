import React, { useState } from "react";
import { useLazyQuery } from "@apollo/client";
import { GET_USER_LOCATION_HISTORY } from "../queries/get_user_location_history";
import { TopBar } from "../components/TopBar";
import { Output } from "../queries/common";
import { Formik } from "formik";

const Index = () => {
  return (
    <div className="min-h-screen dark:bg-gray-600">
      <TopBar />
      <UserTable />
    </div>
  );
};

const UserTable = () => {
  // const [userId, setUserId] = useState("1");
  const [getUserLocationHistory, { loading, data, error, fetchMore }] =
    useLazyQuery<{ get_user_location_history: Output }>(
      GET_USER_LOCATION_HISTORY
    );

  const getMoreData = async () => {
    await fetchMore({
      variables: {
        nextToken: data?.get_user_location_history?.nextToken || "",
      },
    });
  };

  const getData = (userId: string) => {
    console.log(userId);
    getUserLocationHistory({
      variables: {
        user_id: userId,
      },
    });
  };

  return (
    <div className="dark:bg-gray-600 flex justify-center">
      {!!error ? <div>{error.message}</div> : null}
      <div className="rounded-2xl bg-gray-200 p-8 w-max my-4">
        <div className="flex flex-col">
          <Formik
            initialValues={{ userId: "" }}
            onSubmit={(values) => {
              console.log(
                data?.get_user_location_history?.items[0]?.user_id, values.userId
              );
              if (
                data?.get_user_location_history?.items[0]?.user_id ===
                  values.userId.toString() &&
                data?.get_user_location_history?.nextToken
              ) {
                getMoreData();
              } else if (
                !data ||
                data?.get_user_location_history?.items[0]?.user_id !==
                  values.userId.toString()
              ) {
                getData(values.userId);
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
                <div className="flex justify-between">
                  <button
                    className="rounded bg-green-400 hover:bg-green-500 transform-gpu duration-200 transition px-4 py-2 shadow-md disabled:opacity-50 active:bg-green-600 text-white font-bold disabled:cursor-not-allowed"
                    onClick={() => getData(values.userId)}
                    type="button"
                    disabled={
                      data?.get_user_location_history?.items[0]?.user_id ==
                      values.userId
                    }
                  >
                    Get Data
                  </button>
                  <button
                    className="rounded bg-green-400 hover:bg-green-500 transform-gpu duration-200 transition px-4 py-2 shadow-md disabled:opacity-50 active:bg-green-600 text-white font-bold disabled:cursor-not-allowed"
                    onClick={() => getMoreData()}
                    type="button"
                    disabled={
                      data && !data?.get_user_location_history?.nextToken
                    }
                  >
                    More Data
                  </button>
                </div>
                <div className="flex justify-between my-4">
                  <label htmlFor="userId">User Id</label>
                  <input
                    type="number"
                    value={values.userId}
                    onChange={handleChange}
                    name="userId"
                    id="userId"
                  />
                </div>
              </form>
            )}
          </Formik>
        </div>
        <table className="table-auto border border-green-800 border-collapse">
          <thead>
            <tr>
              <th className="px-3 border border-green-800">User Id</th>
              <th className="px-3 border border-green-800">Location Id</th>
              <th className="px-3 border border-green-800">Checkin Time</th>
            </tr>
          </thead>
          <tbody>
            {!!data &&
              data.get_user_location_history.items.map((checkin, index) => {
                if (index % 2 == 0) {
                  return (
                    <tr key={checkin.checkin_datetime}>
                      <td className="bg-green-100 border border-green-700">
                        {checkin.user_id}
                      </td>
                      <td className="bg-green-100 border border-green-700">
                        {checkin.location_id}
                      </td>
                      <td className="bg-green-100 border border-green-700 px-2">
                        {new Date(checkin.checkin_datetime).toLocaleString(
                          "en-AU",
                          { timeZone: "Australia/Melbourne" }
                        )}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={checkin.checkin_datetime}>
                    <td className="bg-green-200 border border-green-700">
                      {checkin.user_id}
                    </td>
                    <td className="bg-green-200 border border-green-700">
                      {checkin.location_id}
                    </td>
                    <td className="bg-green-200 border border-green-700 px-2">
                      {new Date(checkin.checkin_datetime).toLocaleString(
                        "en-AU",
                        { timeZone: "Australia/Melbourne" }
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Index;
