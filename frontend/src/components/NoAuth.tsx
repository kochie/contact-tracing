import React from "react";
import Link from "next/link";

const NoAuth = () => {
  return (
    <div className="flex w-screen justify-center mt-48">
      <div className="text-3xl font-bold">
        Not Authenticated,{" "}
        <span className="underline text-red-900">
          <Link href="/login">Login</Link>
        </span>
      </div>
    </div>
  );
};

export default NoAuth;
