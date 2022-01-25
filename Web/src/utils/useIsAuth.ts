import { useRouter } from "next/router";
import { useEffect } from "react";
import { useMeQuery } from "../generated/graphql";

export const useIsAuth = () => {
    //calling Me Query in NavBar and here. Don't matter... urql is gonna cache (save) the request so it isn't repeated
    const [{ data, fetching }] = useMeQuery();
    const router = useRouter();
    useEffect(() => {
        if (!fetching && !data?.me) {
            // no user logged in
            // we can direct the user to where there were trying to go using the router.pathname variable
            // when the use tries to create a post and is redirected to the login page, the URL will contain a QUERY parameter
            // indicating where the user was trying to go... in this case (create post)
            router.replace("/login?next=" + router.pathname);
        }
    }, [fetching, data, router]);
};
