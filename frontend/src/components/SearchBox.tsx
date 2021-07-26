import React, { useState } from "react";
import { Formik } from "formik";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

interface SearchProps {
  loading: boolean;
  onSubmit: (userId: string, from: string, until: string) => void;
}

const Search = ({ loading, onSubmit }: SearchProps) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex justify-center p-4 bg-gray-600 fixed rounded-br-lg z-40">
      <div className={`w-72 ${open ? "" : "hidden"}`}>
        <Formik
          initialValues={{
            userId: "",
            fromTime: "00:00",
            untilTime: "00:00",
            fromDate: "2021-06-01",
            untilDate: "2021-06-30",
          }}
          onSubmit={({ userId, fromTime, untilTime, fromDate, untilDate }) => {
            const from = new Date(
              `${fromDate}${fromTime ? "T" : ""}${fromTime}`
            ).toJSON();
            const until = new Date(
              `${untilDate}${untilTime ? "T" : ""}${untilTime}`
            ).toJSON();
            // getData(userId, from, until);
            onSubmit(userId, from, until);
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
              <label htmlFor="userId" className="text-white ml-2">
                User Id
              </label>
              <div className="m-2 p-4 rounded bg-white">
                <input
                  type="number"
                  id="userId"
                  name="userId"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.userId}
                  required
                />
              </div>
              <label htmlFor="fromTime" className="text-white ml-2">
                From
              </label>
              <div className="m-2 p-4 rounded bg-white">
                <input
                  type="time"
                  name="fromTime"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.fromTime}
                />
                <input
                  type="date"
                  name="fromDate"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.fromDate}
                />
              </div>
              <label htmlFor="untilTime" className="text-white ml-2">
                Until
              </label>
              <div className="m-2 p-4 rounded bg-white">
                <input
                  type="time"
                  name="untilTime"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.untilTime}
                />
                <input
                  type="date"
                  name="untilDate"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.untilDate}
                />
              </div>
              <div className="rounded m-2 mt-10 text-white text-center cursor-pointer">
                <button type="submit" className="w-full" disabled={loading}>
                  <div className="bg-gray-500 p-4 active:bg-gray-600 shadow-lg hover:bg-gray-800 w-full rounded">
                    {!loading ? (
                      "Get Data"
                    ) : (
                      <FontAwesomeIcon icon={faSpinner} spin />
                    )}
                  </div>
                </button>
              </div>
              <div className="rounded m-2 text-white text-center cursor-pointer">
                <button
                  type="button"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  <div className="bg-red-500 p-4 active:bg-red-600 shadow-lg hover:bg-red-800 w-full rounded">
                    Close
                  </div>
                </button>
              </div>
            </form>
          )}
        </Formik>
      </div>

      <div className={`w-72 ${open ? "hidden" : ""}`}>
        <div className="rounded m-2 text-white text-center cursor-pointer">
          <button
            type="button"
            className="w-full"
            onClick={() => setOpen(true)}
          >
            <div className="bg-green-500 p-4 active:bg-green-600 shadow-lg hover:bg-green-700 w-full rounded">
              Open
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Search;
