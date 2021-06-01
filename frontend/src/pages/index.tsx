import React, {useEffect, useState} from 'react'
import Link from 'next/link'
import {Auth} from 'aws-amplify';
import {useLazyQuery} from "@apollo/client";
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
    const [userId, setUserId] = useState("1")
    const [getUserLocationHistory, {
        loading,
        data,
        error,
        fetchMore
    }] = useLazyQuery<{ get_user_location_history: Output }>(GET_USER_LOCATION_HISTORY)

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
            <button
                className="rounded bg-green-400 hover:bg-green-500 transform-gpu duration-200 transition px-4 py-2 shadow-md disabled:opacity-50 active:bg-green-600 text-white font-bold disabled:cursor-not-allowed"
                onClick={() => getMoreData()} disabled={data && !data.get_user_location_history.nextToken}>More Data
            </button>
            <button
                className="rounded bg-green-400 hover:bg-green-500 transform-gpu duration-200 transition px-4 py-2 shadow-md disabled:opacity-50 active:bg-green-600 text-white font-bold disabled:cursor-not-allowed"
                onClick={() => getUserLocationHistory({
                variables: {
                    user_id: userId
                }
            })}>
                Get Data
            </button>
            <label htmlFor="userId">User Id</label>
            <input type="number" value={userId} onChange={event => setUserId(event.target.value)} name="userId" id="userId"/>
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
                                <td className="bg-green-100 border border-green-700 px-2">{(new Date(checkin.checkin_datetime)).toLocaleString('en-AU', {timeZone: 'Australia/Melbourne'})}</td>
                            </tr>
                        )
                    }
                    return (
                        <tr key={checkin.checkin_datetime}>
                            <td className="bg-green-200 border border-green-700">{checkin.user_id}</td>
                            <td className="bg-green-200 border border-green-700">{checkin.location_id}</td>
                            <td className="bg-green-200 border border-green-700 px-2">{(new Date(checkin.checkin_datetime)).toLocaleString('en-AU', {timeZone: 'Australia/Melbourne'})}</td>
                        </tr>
                    )
                })}
                </tbody>
            </table>
        </div>
    )
}

export default Index