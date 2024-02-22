type returnArray = [
	{
		Object9: { S: string }
		image: { S: string }
		Object8: { S: string }
		Object5: { S: string }
		Object4: { S: string }
		Object7: { S: string }
		Object6: { S: string }
		Object10: { S: string }
		Object1: { S: string }
		Object3: { S: string }
		Object2: { S: string }
		isCached: { BOOL: boolean }
	},
]

export const getLabelsFromApi = async (
	method: string,
	key: string,
	accessToken: string | undefined,
	imageApi: string,
): Promise<returnArray> => {
	const url = `${imageApi}/images?action=${method}&key=${key}`
	const res = await fetch(url, {
		method: 'get',
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	})
	const data = await res.json()
	if (Object.keys(data).length === 0) {
		throw new Error('No labels found')
	}
	return data
}
