import React from "react";
import { useLazyQuery } from "@apollo/client";
import { GET_USER_LOCATION_HISTORY } from "../queries/get_user_location_history";
import { TopBar } from "../components/TopBar";
import { Output } from "../queries/common";
import { Formik } from "formik";
import { useAuth } from "../lib/authHook";
import NoAuth from "../components/NoAuth";

const Index = () => {
  const [isAuth] = useAuth();
  return (
    <div className="min-h-screen dark:bg-gray-600">
      <TopBar />
      {isAuth ? <UserTable /> : <NoAuth />}
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

  const getData = (
    userId: string,
    fromDate: string,
    fromTime: string,
    untilDate: string,
    untilTime: string
  ) => {
    const variables = {
      user_id: userId,
    };
    if (fromDate && fromDate.length > 0) {
      const from = new Date(
        `${fromDate}${fromTime ? "T" : ""}${fromTime}`
      ).toJSON();
      variables["from"] = from;
    }
    if (untilDate && untilDate.length > 0) {
      const until = new Date(
        `${untilDate}${untilTime ? "T" : ""}${untilTime}`
      ).toJSON();
      variables["until"] = until;
    }
    getUserLocationHistory({ variables });
  };

  return (
    <div className="dark:bg-gray-600 flex justify-center">
      {!!error ? <div>{error.message}</div> : null}
      <div className="rounded-2xl bg-gray-200 p-8 w-max my-4">
        <div className="flex flex-col">
          <Formik
            initialValues={{
              userId: "",
              fromDate: "",
              fromTime: "",
              untilDate: "",
              untilTime: "",
            }}
            onSubmit={(values) => {
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
                getData(
                  values.userId,
                  values.fromDate,
                  values.fromTime,
                  values.untilDate,
                  values.untilTime
                );
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
                    onClick={() =>
                      getData(
                        values.userId,
                        values.fromDate,
                        values.fromTime,
                        values.untilDate,
                        values.untilTime
                      )
                    }
                    type="button"
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
                  <label htmlFor="userId" className="my-auto w-20 font-bold">
                    User Id
                  </label>
                  <div className="p-3 rounded bg-white flex-1 flex justify-center">
                    <input
                      type="number"
                      value={values.userId}
                      onBlur={handleBlur}
                      onChange={handleChange}
                      name="userId"
                      id="userId"
                    />
                  </div>
                </div>
                <div className="flex justify-between my-4">
                  <label htmlFor="fromTime" className="my-auto w-20 font-bold">
                    From
                  </label>
                  <div className="p-3 rounded bg-white flex-1 flex justify-center">
                    <input
                      type="time"
                      value={values.fromTime}
                      onBlur={handleBlur}
                      onChange={handleChange}
                      name="fromTime"
                      id="fromTime"
                    />
                    <input
                      type="date"
                      value={values.fromDate}
                      onBlur={handleBlur}
                      onChange={handleChange}
                      name="fromDate"
                      id="fromDate"
                    />
                  </div>
                </div>
                <div className="flex justify-between my-4">
                  <label htmlFor="until" className="my-auto w-20 font-bold">
                    Until
                  </label>
                  <div className="p-3 rounded bg-white flex-1 flex justify-center">
                    <input
                      type="time"
                      value={values.untilTime}
                      onBlur={handleBlur}
                      onChange={handleChange}
                      name="untilTime"
                      id="untilTIme"
                    />
                    <input
                      type="date"
                      value={values.untilDate}
                      onBlur={handleBlur}
                      onChange={handleChange}
                      name="untilDate"
                      id="untilDate"
                    />
                  </div>
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
