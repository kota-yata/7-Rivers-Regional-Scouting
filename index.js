import fetch from "node-fetch";
import fs from "fs";

const HEADER = {
  "X-TBA-Auth-Key": "<YOUR SECRET KEY FOR THE BLUE ALLIANCE API>"
}

const execute = async () => {
  const teams = await getTeams7Rivers();
  const data = await getAllMatchesFromAllTeams(teams);
  generateJSONFile("data.json", data);
}

const getSpecificKey = (json, keyName) => {
  const result = [];
  for (let key in json) {
    result.push(json[key][keyName]);
  }
  return result;
}

const getTeams7Rivers = async () => {
  const res = await fetch("https://www.thebluealliance.com/api/v3/event/2022wila/teams", {
    method: "GET",
    headers: HEADER
  });
  const json = await res.json();
  const keyArray = getSpecificKey(json, "key");
  return keyArray;
};

const getAllianceColorAndNumber = (alliances, teamKey) => {
  const allianceColor = alliances["blue"]["team_keys"].includes(teamKey) ? "blue" : "red";
  const allianceNumber = alliances[allianceColor]["team_keys"].indexOf(teamKey) + 1;
  return [allianceColor, allianceNumber];
}

const getAllMatches = async (teamKey) => {
  const res = await fetch(`https://www.thebluealliance.com/api/v3/team/${teamKey}/matches/2022`, {
    method: "GET",
    headers: HEADER
  });
  const json = await res.json();
  const climber = {
    "None": 0,
    "Low": 0,
    "Mid": 0,
    "High": 0,
    "Traversal": 0
  }
  let autoPoints = 0, teleopPoints = 0, totalPoints = 0, matchCount = 0;
  for (let key in json) {
    const targetMatch = json[key];
    if (targetMatch["winning_alliance"] === "") continue;
    matchCount++;
    let allianceColor, allianceNum;
    [allianceColor, allianceNum] = getAllianceColorAndNumber(targetMatch["alliances"], teamKey);
    const scoreBreakdown = targetMatch["score_breakdown"][allianceColor];
    climber[scoreBreakdown[`endgameRobot${allianceNum}`]]++;
    autoPoints += scoreBreakdown["autoPoints"];
    teleopPoints += scoreBreakdown["teleopPoints"];
    totalPoints += scoreBreakdown["totalPoints"];
  }
  const result = {
    team: teamKey.replace(/frc/g, ""),
    climber,
    aveAutoPoints: matchCount === 0 ? 0 : Math.round(autoPoints / matchCount),
    aveTeleopPoints: matchCount === 0 ? 0 : Math.round(teleopPoints / matchCount),
    aveTotalPoints: matchCount === 0 ? 0 : Math.round(totalPoints / matchCount)
  };
  return result;
};

const getAllMatchesFromAllTeams = async (teams) => {
  const result = [];
  await Promise.all(teams.map(async (team) => {
    const stats = await getAllMatches(team);
    result.push(stats);
  }));
  return result;
}

const generateJSONFile = (fileName, jsonData) => {
  const stringified = JSON.stringify(jsonData);
  fs.writeFile(fileName, stringified, function(err) {
    if (err) {
      throw Error(err);
    }
  });
}

execute();
