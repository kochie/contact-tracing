import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Auth } from "aws-amplify";
import { Button } from "./Button";

export const TopBar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await Auth.currentSession();
      console.log(session);
      if (!!session) setIsAuthenticated(true);
    })();
  }, []);

  return (
    <>
      <div className="w-full h-16 sticky bg-gray-400 shadow-lg top-0 z-50">
        <div className="flex items-center mx-5 h-full gap-4 justify-between">
          <div className="gap-8 flex font-extrabold">
            <div className="hover:text-blue-600">
              <Link href="/">Users Lookup</Link>
            </div>
            <div className="hover:text-blue-600">
              <Link href="/tree">Tree</Link>
            </div>
            <div className="hover:text-blue-600">
              <Link href="/trace">Trace</Link>
            </div>
            <div className="hover:text-blue-600">
              <Link href="/map">Map</Link>
            </div>
          </div>
          <div className="flex gap-4">
            {!isAuthenticated ? (
              <>
                <Button link={"/login"} text={"Login"} />
                <Button link={"/signup"} text={"Sign Up"} />
              </>
            ) : (
              <div className="rounded bg-blue-500 py-2 px-4 shadow-sm transition duration-200 ease-in-out hover:bg-blue-700 transform cursor-pointer text-white">
                Sign Out
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
