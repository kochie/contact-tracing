import React, { FormEvent, useEffect, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client";
import { TRACE_EXPOSURE_FLAT } from "../queries/trace_exposure_flat";
import { linkRadial, select, stratify, tree } from "d3";
import { cloneDeep } from "@apollo/client/utilities";
import Auth from "@aws-amplify/auth";
import { TopBar } from "../component/TopBar";
import { Formik } from "formik";

const margin = { top: 10, right: 30, bottom: 30, left: 40 };

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
      window.removeEventListener("resize", resize)
    }
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
      .size([2 * Math.PI, (Math.min(height, width) / 2) - 10])
      .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

    const s = strat([
      { source: "", target: rootUser.user_id, location_id: "", time: "" },
      ...graph.links,
    ]);
    const root = treeBuilder(s);

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
        linkRadial()
          .angle((d) => d.x)
          .radius((d) => d.y)
      );

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
      .attr("r", 2.5);

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

  return (
    <>
      <TopBar />
      <div>
        <div className="flex justify-center p-4 bg-gray-600 fixed rounded-br-lg">
          <div>
            <Formik
              initialValues={{
                userId: "",
                fromTime: "00:00",
                untilTime: "00:00",
                fromDate: "2021-05-20",
                untilDate: "2021-05-30",
              }}
              onSubmit={({
                userId,
                fromTime,
                untilTime,
                fromDate,
                untilDate,
              }) => {
                const from = new Date(
                  `${fromDate}${fromTime ? "T" : ""}${fromTime}`
                ).toJSON();
                const until = new Date(
                  `${untilDate}${untilTime ? "T" : ""}${untilTime}`
                ).toJSON();
                getData(userId, from, until);
              }}
            >
              {({
                values,
                errors,
                touched,
                handleChange,
                handleBlur,
                handleSubmit,
                isSubmitting,
              }) => (
                <form onSubmit={handleSubmit}>
                  <label htmlFor="userId" className="text-white ml-2">
                    User Id
                  </label>
                  <div className="m-2 p-4 rounded bg-white">
                    <input
                      type="number"
                      id="userId"
                      name="userId"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.userId}
                      required
                    />
                  </div>
                  <label htmlFor="fromTime" className="text-white ml-2">
                    From
                  </label>
                  <div className="m-2 p-4 rounded bg-white">
                    <input
                      type="time"
                      name="fromTime"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.fromTime}
                    />
                    <input
                      type="date"
                      name="fromDate"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.fromDate}
                    />
                  </div>
                  <label htmlFor="untilTime" className="text-white ml-2">
                    Until
                  </label>
                  <div className="m-2 p-4 rounded bg-white">
                    <input
                      type="time"
                      name="untilTime"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.untilTime}
                    />
                    <input
                      type="date"
                      name="untilDate"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.untilDate}
                    />
                  </div>
                  <div className="rounded m-2 mt-10 text-white text-center cursor-pointer">
                    <button type="submit" className="w-full">
                      <div className="bg-gray-500 p-4 active:bg-gray-600 shadow-lg hover:bg-gray-800 w-full rounded">
                        Get Data
                      </div>
                    </button>
                  </div>
                </form>
              )}
            </Formik>
          </div>
        </div>
        {!loading ? (
          <svg width={width} height={height} ref={svgRef} />
        ) : (
          <div className="w-full text-center h-36 font-extrabold text-4xl transform-gpu translate-y-1/2">
            Loading
          </div>
        )}
      </div>
    </>
  );
};

export default Trace;
