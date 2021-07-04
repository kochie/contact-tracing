import { Auth } from "aws-amplify";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

export function useAuth(): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const session = await Auth.currentSession();
        console.log(session);
        if (!!session) setIsAuthenticated(true);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  return [isAuthenticated, setIsAuthenticated];
}
