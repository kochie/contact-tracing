import React, {FormEvent, useState} from "react"
import {Auth} from 'aws-amplify';
import {useRouter} from 'next/router'


const Login = () => {

    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const router = useRouter()

    const login = async (event: FormEvent) => {
        event.preventDefault()
        try {
            const user = await Auth.signIn(username, password)
            console.log(user)
            await router.push("/")
        } catch (error) {
            console.log('error signing in', error);
        }
    }

    return (
        <div className="w-screen h-screen bg-white flex flex-col justify-center">
            <div className="w-96 p-12 m-auto shadow-lg rounded-md bg-gray-200">
                <form onSubmit={login}>
                    <div className="my-2 inline-block w-full">
                        <label htmlFor="username" className="mb-2 text-sm font-bold block">Username</label>
                        <input
                            className="shadow-md rounded-lg p-2 border-black border-1 focus:border-blue-400 focus:border-2 block w-full"
                            type="text" value={username} name="username" id={"username"}
                            onChange={event => setUsername(event.target.value)}
                            placeholder={"Enter Username"}
                        />
                    </div>
                    <div className="my-2 inline-block w-full">
                        <label htmlFor="password" className="mb-2 text-sm font-bold block">Password</label>
                        <input
                            className="shadow-md rounded-lg p-2 border-black border-1 focus:border-blue-400 focus:border-2 block w-full"
                            type="password" value={password} name="password" id="password"
                            onChange={event => setPassword(event.target.value)}
                            placeholder={"Password"}
                        />
                    </div>
                    <div className="mt-8 inline-block w-full">
                        <input type="submit"
                               value="Login"
                               className="w-full rounded bg-green-300 text-white text-center font-bold py-1 cursor-pointer hover:bg-green-400 transform-gpu duration-200 border-2 border-green-500 active:bg-green-700"/>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Login