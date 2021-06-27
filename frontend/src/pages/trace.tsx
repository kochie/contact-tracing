import React, {useEffect, useRef, useState} from 'react'
import {useLazyQuery} from "@apollo/client";
import {TRACE_EXPOSURE_FLAT} from "../queries/trace_exposure_flat";
import {forceCenter, forceLink, forceManyBody, forceSimulation, select, SimulationLinkDatum, SimulationNodeDatum} from 'd3'
import { cloneDeep } from '@apollo/client/utilities';
import Auth from '@aws-amplify/auth';
import {TopBar} from '../components/TopBar'

const margin = {top: 10, right: 30, bottom: 30, left: 40}
// const width = 800
// const height = 400

interface Link {
        location_id: string
        time: string
        source: string
        target: string
    }

interface Node {

        user_id: string
    
}

interface Graph {
    links: Link[]
    nodes: Node[]
}


const isCyclic = (links: Link[]) => {
    const visited = new Set<string>()
    links.forEach(link => {
        visited.add(link.source)
        if (visited.has(link.target)) return true
    })

    return false
}

const Trace = () => {
    const [runQuery, {data, loading}] = useLazyQuery(TRACE_EXPOSURE_FLAT)
    const [userId, setUserId] = useState("1")
    const svgRef = useRef<SVGSVGElement>(null)

    const [width, setWidth] = useState(800)
    const [height, setHeight] = useState(400)

    const resize = () => {
        setWidth(window.innerWidth)
        setHeight(window.innerHeight)
    }
    
    useEffect(() => {
        window.addEventListener('resize', resize)
        resize()
    }, [])


    useEffect(() => {
        (async () => {
            const session = await Auth.currentSession()
            console.log(session)
        })()
    }, [])

    useEffect(() => {
        if (!data) return
        if (!svgRef.current) return

        console.log("hello", data)
        const graph: Graph = cloneDeep(data.trace_exposure_flat)

        console.log("IS_CYCLIC", isCyclic(graph.links))

        const svg = select(svgRef.current).attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const link = svg
            .selectAll("line")
            .data(graph.links)
            .enter()
            .append("line")
            .style("stroke", "#aaa")

        // Initialize the nodes
        const node = svg
            .selectAll("circle")
            .data(graph.nodes)
            .enter()
            .append("circle")
            .attr("r", 2)
            .style("fill", "#69b3a2")

        // Let's list the force we wanna apply on the network
        const simulation = forceSimulation<SimulationNodeDatum & Node>(graph.nodes)                 // Force algorithm is applied to data.nodes
            .force("link", forceLink()                               // This force provides links between nodes
                .id(function (d: SimulationNodeDatum & Node) {
                    return d.user_id;
                })                     // This provide  the id of a node
                .links(graph.links)                                    // and this the list of links
            )
            .force("charge", forceManyBody())         // This adds repulsion between nodes. Play with the -400 for the repulsion strength
            .force("center", forceCenter(width / 2, height / 2))     // This force attracts nodes to the center of the svg area
            .on("tick", ticked);

        // // This function is run at each iteration of the force algorithm, updating the nodes position.
        function ticked() {
            link
                .attr("x1", function (d) {
                    // @ts-expect-error
                    return d.x;
                })
                .attr("y1", function (d) {
                    // @ts-expect-error
                    return d.source.y;
                })
                .attr("x2", function (d) {
                    // @ts-expect-error
                    return d.target.x;
                })
                .attr("y2", function (d) {
                    // @ts-expect-error
                    return d.target.y;
                });

            node
                .attr("cx", function (d) {
                    // @ts-expect-error
                    return d.x;
                })
                .attr("cy", function (d) {
                    // @ts-expect-error
                    return d.y;
                });
        }

        return () => {
            svg.selectAll("*").remove()
        }
    }, [data])

    const getData = () => {
        console.log("AH")
        runQuery({
            variables: {
                user_id: userId
            }
        })
    }

    return (
        <>
        <TopBar />
        <div>
            <input type="number" value={userId} onChange={event => setUserId(event.target.value)}/>
            <input type="button" onClick={getData} value="Get Data"/>
            {!loading ?
                (
                    <svg width={width} height={height} ref={svgRef}/>
                ) : null
            }
        </div>
        </>
    )
}

export default Trace