import { App } from 'aws-cdk-lib'
import { CIStack } from './stacks/CIStack.js'

export class CIApp extends App {
	public constructor(props: ConstructorParameters<typeof CIStack>[1]) {
		super()

		new CIStack(this, props)
	}
}
