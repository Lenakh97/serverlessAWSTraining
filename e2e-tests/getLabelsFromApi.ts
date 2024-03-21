type ImageLabels = {
	imageKey: string
	labels: Array<string>
	isCached: boolean
}

export const getLabelsFromApi = async (
	method: string,
	key: string,
	accessToken: string | undefined,
	imageApi: string,
): Promise<ImageLabels> => {
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
	const labels: Array<string> = []
	const dataEntries: [string, Record<'S' | 'BOOL', string>][] = Object.entries(
		data[0],
	)
	for (const [key, value] of dataEntries) {
		if (key.includes('Object')) {
			labels.push(value.S)
		}
	}
	return {
		imageKey: data[0].image,
		isCached: data[0].isCached.BOOL,
		labels,
	}
}
