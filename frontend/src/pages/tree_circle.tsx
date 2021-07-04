import React, { useEffect, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client";
import { TRACE_EXPOSURE_FLAT } from "../queries/trace_exposure_flat";
import { linkRadial, select, stratify, tree } from "d3";
import { cloneDeep } from "@apollo/client/utilities";
import Auth from "@aws-amplify/auth";
import { TopBar } from "../components/TopBar";
import SearchBox from "../components/SearchBox";
import { useAuth } from "../lib/authHook";
import NoAuth from "../components/NoAuth";

// const margin = { top: 10, right: 30, bottom: 30, left: 40 };

interface Link {
  location_id: string;
  time: string;
  source: string;
  target: string;
}

interface Graph {
  links: Link[];
  nodes: {
    user_id: string;
  }[];
}

const Trace = () => {
  const [runQuery, { data, loading }] = useLazyQuery(TRACE_EXPOSURE_FLAT);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);

  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(400);

  const resize = () => {
    // console.log("eh")
    setWidth(window.innerWidth);
    setHeight(window.innerHeight - 64);
  };

  useEffect(() => {
    window.addEventListener("resize", resize);
    resize();

    return () => {
      window.removeEventListener("resize", resize);
    };
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
    if (!tooltip.current) return;

    // console.log("hello", data);
    const graph: Graph = cloneDeep(data.trace_exposure_flat);
    const strat = stratify<Link>()
      .id((d) => d.target)
      .parentId((d) => d.source);

    const rootUser = graph.nodes[0];

    const svg = select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    const treeBuilder = tree<Link>()
      .size([2 * Math.PI, Math.min(height, width) / 2 - 10])
      .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

    const s = strat([
      { source: "", target: rootUser.user_id, location_id: "", time: "" },
      ...graph.links,
    ]);
    const root = treeBuilder(s);

    var div = select(tooltip.current)
      //  .attr("class", "tooltip")
      .style("opacity", 0);

    svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .selectAll("path")
      .data(root.links())
      .join("path")
      .attr(
        "d",
        // @ts-expect-error
        linkRadial()
          // @ts-expect-error
          .angle((d) => d.x)
          // @ts-expect-error
          .radius((d) => d.y)
      )
      .on("mouseover", function (d, i) {
        select(this).transition().duration(100).attr("stroke-width", 3);
        div.transition().duration(100).style("opacity", 1);
        // mouse(this)
        // console.log(i)

        div
          .html(() => {
            const x = graph.links.find(
              (link) =>
                link.source === i.source.id && link.target === i.target.id
            );
            // console.log(Date.parse(x.time).toLocaleString('en'))

            return (
              "<div>Location ID: " +
              x.location_id +
              "</div><div>DateTime: " +
              new Date(x.time).toLocaleString("en-AU", {
                timeZone: "Australia/Melbourne",
              }) +
              "</div>"
            );
          })
          .style("left", d.pageX + 10 + "px")
          .style("top", d.pageY - 15 + "px");
      })
      .on("mouseout", function (d, i) {
        select(this).transition().duration(200).attr("stroke-width", 1.5);
        div.transition().duration(200).style("opacity", 0);
      });

    svg
      .append("g")
      .selectAll("circle")
      .data(root.descendants())
      .join("circle")
      .attr(
        "transform",
        (d) => `
            rotate(${(d.x * 180) / Math.PI - 90})
            translate(${d.y},0)
            `
      )
      .attr("fill", (d) => (d.children ? "#555" : "#999"))
      .attr("r", 2.5)
      .on("mouseover", function (d, i) {
        select(this).transition().duration(100).attr("r", 5);
        div.transition().duration(100).style("opacity", 1);
        // mouse(this)
        // console.log(i)
        div
          .html("User ID: " + i.id)
          .style("left", d.pageX + 10 + "px")
          .style("top", d.pageY - 15 + "px");
      })
      .on("mouseout", function (d, i) {
        select(this).transition().duration(200).attr("r", 2.5);
        div.transition().duration(200).style("opacity", 0);
      });

    return () => {
      svg.selectAll("*").remove();
    };
  }, [data, width, height]);

  const getData = (userId: string, from: string, until: string) => {
    runQuery({
      variables: {
        user_id: userId,
        from,
        until,
      },
    });
  };

  const [isAuth] = useAuth();

  return (
    <div className="h-screen overflow-hidden">
      <TopBar />
      <>
        {isAuth ? (
          <>
            <SearchBox
              loading={loading}
              onSubmit={(userId, from, until) => getData(userId, from, until)}
            />
            <div className="">
              {!loading ? (
                <>
                  <svg width={width} height={height} ref={svgRef} />
                  <div
                    ref={tooltip}
                    className={`absolute text-center p-1 bg-gray-400 text-white rounded pointer-events-none top-0`}
                  />
                </>
              ) : (
                <div className="w-full text-center h-36 font-extrabold text-4xl transform-gpu translate-y-1/2">
                  Loading
                </div>
              )}
            </div>

            <div className="fixed bottom-0 right-0 rounded-tl-lg bg-gray-200 bg-opacity-50 px-6 py-3 max-w-lg font-mono text-sm leading-tight">
              <p>
                This component will create a radial tidy tree. This diagram is
                useful for understanding how many degrees of separation are
                between an exposed contact and other users.
              </p>
              <p>
                The edges represent locations while the verticies are individual
                users.
              </p>
            </div>
          </>
        ) : (
          <NoAuth />
        )}
      </>
    </div>
  );
};

export default Trace;
