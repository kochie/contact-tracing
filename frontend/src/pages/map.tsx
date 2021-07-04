import React, { useEffect, useRef, useState } from "react";
import { TopBar } from "../components/TopBar";
import mapbox, { Popup } from "mapbox-gl";
import { useLazyQuery } from "@apollo/client";
import { TRACE_EXPOSURE_FLAT } from "../queries/trace_exposure_flat";
import { cloneDeep } from "@apollo/client/utilities";
import SearchBox from "../components/SearchBox";

import "mapbox-gl/dist/mapbox-gl.css";
import { useAuth } from "../lib/authHook";
import NoAuth from "../components/NoAuth";

// mapbox.accessToken = process.env.NEXT_PUBIC_MAPBOX_TOKEN;
// console.log(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)

interface Link {
  location_id: string;
  time: string;
  source: string;
  target: string;
  latitude: string;
  longitude: string;
}

interface Graph {
  links: Link[];
  locations: {
    location_id: string;
    latitude: string;
    longitude: string;
  }[];
  nodes: {
    user_id: string;
  }[];
}

const Map = () => {
  const container = useRef<HTMLDivElement>(null);
  const [runQuery, { data, loading }] = useLazyQuery(TRACE_EXPOSURE_FLAT);
  const [map, setMap] = useState<mapbox.Map>();
  const [markers, setMarkers] = useState<mapbox.Marker[]>([]);

  useEffect(() => {
    //   console.log(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
    const m = new mapbox.Map({
      container: container.current, // container id
      style: "mapbox://styles/mapbox/streets-v11", // style URL
      center: [144.96332, -37.814], // starting position [lng, lat]
      zoom: 8, // starting zoom
      accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    });

    m.addControl(
      new mapbox.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      })
    );

    setMap(m);
  }, []);

  useEffect(() => {
    if (!data?.trace_exposure_flat) return;
    if (!map) return;
    const graph: Graph = cloneDeep(data.trace_exposure_flat);

    // console.log(graph);
    const m = graph.locations.map((location) => {
      const exposeTime =
        graph.links.find((link) => link.location_id === location.location_id)
          ?.time || "";

      // This only happens if the location was exposed but no new people were checkin in.
      // For this example we'll leave blank
      if (!exposeTime) return;

      return new mapbox.Marker()
        .setPopup(
          new Popup({ offset: 25 }).setHTML(`<div>
            Location Id: ${location.location_id}
        </div><div>
            Time Exposed: ${
              exposeTime ? new Date(exposeTime).toLocaleString() : "Not Exposed"
            }
        </div>`)
        )
        .setLngLat([
          parseFloat(location.longitude),
          parseFloat(location.latitude),
        ])
        .addTo(map);
    });

    setMarkers(m);
    return () => {
      markers.forEach((m) => (m ? m.remove() : null));
    };
  }, [data, map]);

  const [isAuth] = useAuth();

  return (
    <>
      <TopBar />
      <>
        {isAuth ? (
          <>
            <SearchBox
              loading={loading}
              onSubmit={(userId, from, until) =>
                runQuery({ variables: { user_id: userId, from, until } })
              }
            />
            <div
              ref={container}
              className="w-screen"
              style={{ height: "calc(100vh - 64px)" }}
            />

            <div className="fixed bottom-5 right-0 rounded-l-lg bg-gray-200 bg-opacity-50 px-6 py-3 max-w-lg font-mono text-sm leading-tight">
              <p>
                This map shows all the places that have become exposure
                locations.
              </p>
              <p>
                You can see what time a location was exposed by clicking on the
                marker.
              </p>
              <p>
                Note some locations where users have checked in but no new
                exposures occured have been ommited.
              </p>
            </div>
          </>
        ) : (
          <NoAuth />
        )}
      </>
    </>
  );
};

export default Map;
