import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Auth } from "aws-amplify";
import { Button } from "./Button";
import { useAuth } from "../lib/authHook";

export const TopBar = () => {
  const [isAuthenticated, setIsAuthenticated] = useAuth();

  return (
    <>
      <div className="w-full h-16 sticky bg-gray-400 shadow-lg top-0 z-50">
        <div className="flex items-center mx-5 h-full gap-4 justify-between">
          <div className="text-2xl font-bold flex-1">
            Contact Trace Dashboard
          </div>
          <div className="gap-8 flex font-extrabold">
            <div className="hover:text-blue-600">
              <Link href="/">User Lookup</Link>
            </div>
            <div className="hover:text-blue-600">
              <Link href="/location">Location Lookup</Link>
            </div>
            <div className="hover:text-blue-600">
              <Link href="/tree_circle">Tidy Tree</Link>
            </div>
            <div className="hover:text-blue-600">
              <Link href="/tree">Tree</Link>
            </div>
            <div className="hover:text-blue-600">
              <Link href="/tree_time">Timeline Tree</Link>
            </div>
            <div className="hover:text-blue-600">
              <Link href="/map">Map</Link>
            </div>
          </div>
          <div className="flex gap-4 flex-1 justify-end">
            {!isAuthenticated ? (
              <>
                <Button link={"/login"} text={"Login"} />
                <Button link={"/signup"} text={"Sign Up"} />
              </>
            ) : (
              <div
                className="rounded bg-blue-500 py-2 px-4 shadow-sm transition duration-200 ease-in-out hover:bg-blue-700 transform cursor-pointer text-white"
                onClick={async () => {
                  await Auth.signOut();
                  setIsAuthenticated(false);
                }}
              >
                Sign Out
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
