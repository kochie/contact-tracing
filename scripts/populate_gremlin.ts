import { driver, process } from "gremlin";
import traversal = process.traversal;
import DriverRemoteConnection = driver.DriverRemoteConnection;
import {
  generateCheckins,
  numberOfLocations,
  numberOfUsers,
} from "./generate_data";

const populateGremlin = async () => {
  const checkins = generateCheckins();
  console.log(`generated ${checkins.length} entries`);
  const g = traversal().withRemote(
    new DriverRemoteConnection("ws://localhost:8182/gremlin")
  );

  const nodes = [];
  const locations = new Map<string, any>();
  const users = new Map<string, any>();
  // const t = g.V()
  for (let i = 0; i <= numberOfLocations; i++) {
    nodes.push(
      (async (j) => {
        const v = await g
          .addV("Location")
          .property("location_id", j.toString())
          .next();
        locations.set(j.toString(), v.value);
      })(i)
    );
  }
  // console.log("Locations Sent")
  // await t.iterate()
  // console.log("Locations Done")

  for (let i = 0; i <= numberOfUsers; i++) {
    nodes.push(
      (async (j) => {
        const v = await g.addV("User").property("user_id", j.toString()).next();
        users.set(j.toString(), v.value);
      })(i)
    );
  }

  console.log("Sent all build requests for nodes");
  await Promise.all(nodes);
  console.log("done");
  // console.log("Users Sent")
  // await t.iterate()
  // console.log("Users Done")

  await checkins.reduce(async (memo, checkin) => {
    await memo;
    // const user = await g.V().has("user_id", checkin.user_id).next()
    // const location = await g.V().has("location_id", checkin.location_id).next()
    await g
      .addE("checked_in")
      .from_(users.get(checkin.user_id.toString()))
      .to(locations.get(checkin.location_id.toString()))
      .property("checkin_time", checkin.checkin_datetime)
      .iterate();
  }, Promise.resolve());

  console.log("done");
};

populateGremlin();
// checkins.forEach(async (checkin) => {
//     const v1 = await g.addV("location").property("location_id", checkin.location_id).next()
//     const v2 = await g.addV("user").property("user_id", checkin.user_id).next()
//     const e = await g.addE("checkin").from_(v1).to(v2).property("time", checkin.checkin_datetime.toJSON()).next()
// })
