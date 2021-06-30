import React from "react";
import Link from "next/link";

interface ButtonProps {
  link: string;
  text: string;
}

export const Button = ({ link, text }: ButtonProps) => {
  return (
    <Link href={link} passHref>
      <div className="rounded bg-blue-500 py-2 px-4 shadow-sm transition duration-200 ease-in-out hover:bg-blue-700 transform cursor-pointer text-white">
        {text}
      </div>
    </Link>
  );
};
