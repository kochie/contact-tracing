import React, {useEffect, useState} from 'react'
import Link from 'next/link'
import {Auth} from 'aws-amplify';
import {useQuery} from "@apollo/client";
import {GET_USER_LOCATION_HISTORY, Output} from "../queries/get_user_location_history";

const Index = () => {
    return (
        <div>
            <TopBar/>
            <UserTable/>
        </div>
    )
}

const Login = () => {

    useEffect(() => {
        const queryParamsString = window.location.hash

        console.log(queryParamsString)

        const queryParams = queryParamsString.split('&').reduce((accumulator, singleQueryParam) => {
            const [key, value] = singleQueryParam.split('=');
            accumulator[key] = decodeURIComponent(value);
            return accumulator;
        }, {})

        console.log(queryParams)

        localStorage.setItem("id_token", queryParams["#id_token"])
    }, [])
    return null
}

const TopBar = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        (async () => {
            const session = await Auth.currentSession()
            console.log(session)
            if (!!session) setIsAuthenticated(true)
        })()
    }, [])

    return (
        <>
            <div className="w-full h-16 sticky bg-gray-400 shadow-lg top-0">
                <div className="flex items-center mx-5 h-full gap-4">
                    {!isAuthenticated ?
                        (
                            <>
                                <Button link={"/login"} text={"Login"}/>
                                <Button link={"/signup"} text={"Sign Up"}/>
                            </>
                        )
                        : null}
                </div>
            </div>
            {/*<div className={""}>*/}

        </>
    )
}

interface ButtonProps {
    link: string
    text: string
}


const Button = ({link, text}: ButtonProps) => {
    return (
        <div
            className="rounded bg-blue-500 py-2 px-4 shadow-sm transition duration-200 ease-in-out hover:bg-blue-700 transform cursor-pointer text-white">
            <Link href={link}>{text}</Link>
        </div>
    )
}

const UserTable = () => {
    const {
        loading,
        data,
        error,
        fetchMore
    } = useQuery<{ get_user_location_history: Output }>(GET_USER_LOCATION_HISTORY, {
        variables: {
            user_id: "3"
        }
    })

    // useEffect(() => {
    //     fetchMore({
    //         variables: {
    //             nextToken: data.nextToken
    //         }
    //     })
    //     console.log("HELLO", data)
    // }, [data])

    const getMoreData = async () => {
        console.log("WEEEE", data)
        await fetchMore({
            variables: {
                nextToken: data?.get_user_location_history?.nextToken || ""
            }
        })
        console.log("HELLO", data)
    }

    console.log(loading, data)
    return (
        <div>
            <button onClick={() => getMoreData()} disabled={data && !data.get_user_location_history.nextToken}>More Data</button>
            <div>
                Hello
            </div>
            {!!error ? (
                <div>{error.message}</div>
            ) : null}
            <table className="table-auto border border-green-800 border-collapse">
                <thead>
                <tr>
                    <th className="px-3 border border-green-800">UserId</th>
                    <th className="px-3 border border-green-800">LocationId</th>
                    <th className="px-3 border border-green-800">Checkin Time</th>
                </tr>
                </thead>
                <tbody>
                {!!data && data.get_user_location_history.items.map((checkin, index) => {
                    if (index % 2 == 0) {
                        return (
                            <tr key={checkin.checkin_datetime}>
                                <td className="bg-green-100 border border-green-700">{checkin.user_id}</td>
                                <td className="bg-green-100 border border-green-700">{checkin.location_id}</td>
                                <td className="bg-green-100 border border-green-700">{checkin.checkin_datetime}</td>
                            </tr>
                        )
                    }
                    return (
                        <tr key={checkin.checkin_datetime}>
                            <td className="bg-green-200 border border-green-700">{checkin.user_id}</td>
                            <td className="bg-green-200 border border-green-700">{checkin.location_id}</td>
                            <td className="bg-green-200 border border-green-700">{checkin.checkin_datetime}</td>
                        </tr>
                    )
                })}
                </tbody>
            </table>
        </div>
    )
}

export default Index