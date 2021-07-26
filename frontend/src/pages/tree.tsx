import React, { useEffect, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client";
import { TRACE_EXPOSURE_FLAT } from "../queries/trace_exposure_flat";
import {
  select,
  drag,
  hierarchy,
  forceX,
  forceY,
  forceManyBody,
  forceLink,
  forceSimulation,
  stratify,
  scaleOrdinal,
  schemeSpectral,
  max,
  interpolateSinebow,
} from "d3";
import { cloneDeep } from "@apollo/client/utilities";
import Auth from "@aws-amplify/auth";
import { TopBar } from "../components/TopBar";
import SearchBox from "../components/SearchBox";
import NoAuth from "../components/NoAuth";
import { useAuth } from "../lib/authHook";

// const margin = {top: 10, right: 30, bottom: 30, left: 40}
// const width = 800
// const height = 400

interface Link {
  location_id: string;
  time: string;
  source: string;
  target: string;
}

interface Node {
  user_id: string;
}

interface Graph {
  links: Link[];
  nodes: Node[];
}

const Trace = () => {
  const [runQuery, { data, loading }] = useLazyQuery(TRACE_EXPOSURE_FLAT);
  const svgRef = useRef<SVGSVGElement>(null);

  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(400);

  const resize = () => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight - 64);
  };

  useEffect(() => {
    window.addEventListener("resize", resize);
    resize();
  }, []);

  useEffect(() => {
    (async () => {
      const session = await Auth.currentSession();
      console.log(session);
    })();
  }, []);

  useEffect(() => {
    if (!data) return;
    if (!svgRef.current) return;

    // console.log("hello", data)
    const graph: Graph = cloneDeep(data.trace_exposure_flat);

    const strat = stratify<Link>()
      .id((d) => d.target)
      .parentId((d) => d.source);

    const rootUser = graph.nodes[0];

    const s = strat([
      { source: "", target: rootUser.user_id, location_id: "", time: "" },
      ...graph.links,
    ]);

    // console.log("IS_CYCLIC", isCyclic(graph.links))

    const svg = select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height].join(" "))
      .append("g");
    // .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const dragSimulation = (simulation) => {
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      return drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    };

    const root = hierarchy(s);
    const links = root.links();
    const nodes = root.descendants();

    // const scheme = schemeSpectral[11]
    // console.log(scheme)
    // const color = scaleOrdinal()
    // .domain(graph.links.map(d => d.location_id))
    // .range(interpolateSinebow)
    // .unknown("#ccc")

    // @ts-expect-error
    const simulation = forceSimulation(nodes)
      .force(
        "link",
        // @ts-expect-error
        forceLink(links)
          // @ts-expect-error
          .id((d) => d.id)
          .distance(0)
          .strength(1)
      )
      .force("charge", forceManyBody().strength(-60))
      .force("x", forceX())
      .force("y", forceY());

    const locationMax = max(graph.links.map((l) => parseInt(l.location_id)));

    const link = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.7)
      .attr("stroke-width", "2")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => {
        // console.log(d)
        const line = graph.links.find(
          (l) => l.source === d.source.data.id && l.target === d.target.data.id
        );
        return interpolateSinebow(parseInt(line.location_id) / locationMax);
      });

    const node = svg
      .append("g")
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("fill", (d) => (d.children ? null : "#000"))
      .attr("stroke", (d) => (d.children ? null : "#fff"))
      .attr("r", 4.5)
      // @ts-expect-error
      .call(dragSimulation(simulation));

    node.append("title").text((d) => "UserID: " + d.data.id);

    simulation.on("tick", () => {
      link
        // @ts-expect-error
        .attr("x1", (d) => d.source.x)
        // @ts-expect-error
        .attr("y1", (d) => d.source.y)
        // @ts-expect-error
        .attr("x2", (d) => d.target.x)
        // @ts-expect-error
        .attr("y2", (d) => d.target.y);

      // @ts-expect-error
      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    // invalidation.then(() => simulation.stop());

    return () => {
      svg.selectAll("*").remove();
    };
  }, [data, height, width]);

  const [isAuth] = useAuth();

  return (
    <div>
      <TopBar />
      {isAuth ? (
        <>
          <SearchBox
            loading={loading}
            onSubmit={(userId, from, until) => {
              runQuery({
                variables: {
                  user_id: userId,
                  from,
                  until,
                },
              });
            }}
          />
          <div>
            {!loading ? (
              <svg width={width} height={height} ref={svgRef} />
            ) : null}
          </div>
          <div className="fixed bottom-0 right-0 rounded-tl-lg bg-gray-200 bg-opacity-50 px-6 py-3 max-w-lg font-mono text-sm leading-tight">
            <p>
              This component will generate a tree showing the exposure contacts
              have with each other.
            </p>
            <p>
              {" "}
              The colours of the edges indicate locations, if edges of the same
              node have the same colour then it means the exposure happened at
              the same location.
            </p>
          </div>
        </>
      ) : (
        <NoAuth />
      )}
    </div>
  );
};

export default Trace;
