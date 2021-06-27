import React, { useEffect, useRef, useState } from "react";
import { TopBar } from "../components/TopBar";
import mapbox from "mapbox-gl";
import { useLazyQuery } from "@apollo/client";
import { TRACE_EXPOSURE_FLAT } from "../queries/trace_exposure_flat";
import { cloneDeep } from "@apollo/client/utilities";
import SearchBox from "../components/SearchBox";

import "mapbox-gl/dist/mapbox-gl.css";

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
      center: [-74.5, 40], // starting position [lng, lat]
      zoom: 9, // starting zoom
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

    markers.forEach((m) => m.remove());

    console.log(graph);
    const m = graph.locations.map((location) => {
      return new mapbox.Marker()
        .setLngLat([
          parseFloat(location.longitude),
          parseFloat(location.latitude),
        ])
        .addTo(map);
    });

    setMarkers(m);
  }, [data, map]);

  return (
    <>
      <TopBar />
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
    </>
  );
};

export default Map;
