import axios from "axios";

export const getLabelsFromApi = async (
  method: string,
  key: string,
  accessToken: string | undefined,
  imageApi: string
) => {
  const url = `${imageApi}/images?action=${method}&key=${key}`;
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (Object.keys(res.data).length === 0) {
    throw new Error("No labels found");
  }
  return res.data;
};
