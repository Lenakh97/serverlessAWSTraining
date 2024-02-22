import chalk from 'chalk'
import { program } from 'commander'
import { createInterface } from 'readline'
import psjon from '../package.json'
import type { CommandDefinition } from './commands/CommandDefinition.js'
import { purgeBucketObjectsCommand } from './commands/purge-bucket-objects.js'

const die = (err: Error, origin: any) => {
	console.error(`An unhandled exception occured!`)
	console.error(`Exception origin: ${JSON.stringify(origin)}`)
	console.error(err)
	process.exit(1)
}

process.on('uncaughtException', die)
process.on('unhandledRejection', die)

console.log('')

const confirm = (
	confirm: string,
	command: CommandDefinition,
): CommandDefinition => ({
	...command,
	action: async (...args) => {
		const rl = createInterface({
			input: process.stdin,
			output: process.stdout,
		})
		await new Promise<void>((resolve, reject) =>
			rl.question(`${chalk.blueBright(confirm)} (y,N): `, (answer) => {
				rl.close()
				if (answer === 'y') return resolve()
				reject(new Error(`Answered NO to ${confirm}!`))
			}),
		)
		return command.action(...args)
	},
})

const CLI = async ({ isCI }: { isCI: boolean }) => {
	program.description(
		`ServerlessAWSTraining ${psjon.version} Command Line Interface`,
	)
	program.version(psjon.version)

	const commands = []

	if (isCI) {
		console.error('Running on CI...')
		commands.push(purgeBucketObjectsCommand())
	} else {
		commands.push(
			confirm('Do you really purge all buckets?', purgeBucketObjectsCommand()),
		)
	}

	let ran = false
	commands.forEach(({ command, action, help, options }) => {
		const cmd = program.command(command)
		cmd
			.action(async (...args) => {
				try {
					ran = true
					await action(...args)
				} catch (error) {
					console.error(
						chalk.red.inverse(' ERROR '),
						chalk.red(`${command} failed!`),
					)
					console.error(chalk.red.inverse(' ERROR '), chalk.red(error))
					process.exit(1)
				}
			})
			.on('--help', () => {
				console.log('')
				console.log(chalk.yellow(help))
				console.log('')
			})
		if (options) {
			options.forEach(({ flags, description, defaultValue }) =>
				cmd.option(flags, description, defaultValue),
			)
		}
	})

	program.parse(process.argv)

	if (!ran) {
		program.outputHelp(chalk.yellow)
		throw new Error('No command selected!')
	}
}

CLI({
	isCI: process.env.CI === '1',
}).catch((err) => {
	console.error(chalk.red(err))
	process.exit(1)
})
