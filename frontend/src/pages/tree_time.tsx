import React, { useEffect, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client";
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
  max,
  interpolateSinebow,
  scaleTime,
} from "d3";
import { cloneDeep } from "@apollo/client/utilities";
import Auth from "@aws-amplify/auth";
import { TopBar } from "../components/TopBar";
import SearchBox from "../components/SearchBox";
import { TRACE_EXPOSURE_OVER_TIME } from "../queries/trace_exposure_over_time";
import { useAuth } from "../lib/authHook";
import NoAuth from "../components/NoAuth";

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

let oldNodes = new Map();

const Trace = () => {
  const [runQuery, { data, loading }] = useLazyQuery(TRACE_EXPOSURE_OVER_TIME);
  const svgRef = useRef<SVGSVGElement>(null);

  const [step, setStep] = useState(1);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(400);
  const [dateRange, setDateRange] = useState([
    new Date().toJSON(),
    new Date().toJSON(),
  ]);

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

    const exposure_list: Graph[] = cloneDeep(data.trace_exposure_over_time);

    const graph: Graph = {
      links: [],
      nodes: [],
    };

    for (let i = 0; i < step; i++) {
      graph.links.push(...exposure_list[i].links);
      graph.nodes.push(...exposure_list[i].nodes);
    }

    const strat = stratify<Link>()
      .id((d) => d.target)
      .parentId((d) => d.source);

    const rootUser = graph.nodes[0];

    const s = strat([
      { source: "", target: rootUser.user_id, location_id: "", time: "" },
      ...graph.links,
    ]);

    const svg = select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height].join(" "))
      .append("g");

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

    const nodes = root.descendants().map((d) => {
      const n = oldNodes.get(d.data.id);
      if (n) {
        // @ts-expect-error
        d.x = n.x;
        // @ts-expect-error
        d.y = n.y;
      } else if (d.parent) {
        // @ts-expect-error
        d.x = d.parent.x + 20;
        //@ts-expect-error
        d.y = d.parent.y;
      }

      return d;
    });
    const links = root.links();

    // @ts-expect-error
    const simulation = forceSimulation(nodes)
      .force(
        "link",
        // @ts-expect-error
        forceLink(links)
          .id((d) => d.index)
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
        const line = graph.links.find(
          (l) => l.source === d.source.data.id && l.target === d.target.data.id
        );
        return interpolateSinebow(parseInt(line.location_id) / locationMax);
      })
      // @ts-expect-error
      .attr("x1", (d) => d.source.x)
      // @ts-expect-error
      .attr("y1", (d) => d.source.y)
      // @ts-expect-error
      .attr("x2", (d) => d.target.x)
      // @ts-expect-error
      .attr("y2", (d) => d.target.y);

    const node = svg
      .append("g")
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("fill", (d) => {
        let c = d.children ? null : "#000";
        if (!oldNodes.has(d.data.id)) {
          c = "red";
        }
        return c;
      })
      .attr("stroke", (d) => (d.children ? null : "#fff"))
      .attr("r", 4.5)
      // @ts-expect-error
      .attr("cx", (d) => d.x)
      // @ts-expect-error
      .attr("cy", (d) => d.y)
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

    return () => {
      oldNodes = new Map(node.data().map((d) => [d.data.id, { ...d }]));
      svg.remove();
    };
  }, [data, height, width, step]);

  const x = scaleTime()
    .domain([new Date(dateRange[0]), new Date(dateRange[1])])
    .range([1, data?.trace_exposure_over_time?.length || 1]);

  const [isAuth] = useAuth();

  return (
    <div>
      <TopBar />
      {isAuth ? (
        <>
          <SearchBox
            loading={loading}
            onSubmit={(userId, from, until) => {
              setDateRange([from, until]);
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
              <>
                <div className="fixed w-screen flex justify-center mt-5">
                  <div className="flex flex-col text-center">
                    <input
                      type="range"
                      min={1}
                      max={data?.trace_exposure_over_time?.length || 1}
                      value={step}
                      onChange={(e) => setStep(parseInt(e.target.value))}
                    />
                    <div>{x.invert(step).toDateString()}</div>
                  </div>
                </div>
                <svg width={width} height={height} ref={svgRef} />
              </>
            ) : null}
          </div>
          <div className="fixed bottom-0 right-0 rounded-tl-lg bg-gray-200 bg-opacity-50 px-6 py-3 max-w-lg font-mono text-sm leading-tight">
            <p>
              This component will generate a tree showing the exposure contacts
              have with each other.<p></p>The colours of the edges indicate
              locations, if edges of the same node have the same colour then it
              means the exposure happened at the same location.
            </p>
            <p>
              You can use the slider to see how the exposed group grows over
              time. Red verticies indicate new users that were infected during
              the last step (in this case 24 hours).
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
