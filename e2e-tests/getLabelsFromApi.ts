// TODO: move test code to separate folder
import fetch from "node-fetch";

export const getLabelsFromApi = async (
  method: string,
  key: string,
  accessToken: string | undefined,
  imageApi: string
) => {
  const url = `${imageApi}/images?action=${method}&key=${key}`;
  const res = await fetch(url, {
    method: "get",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await res.json();
  if (Object.keys(data).length === 0) {
    throw new Error("No labels found");
  }
  return data;
};
