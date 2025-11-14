#!/usr/bin/env node

/**
 * HyperSDK Evaluation Runner
 * Discovers and runs all eval files in the evals/ directory
 */

import { readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const EVALS_DIR = join(__dirname, 'evals')

async function runEval(evalPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [evalPath], {
      stdio: 'inherit',
      cwd: __dirname
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ path: evalPath, passed: true })
      } else {
        resolve({ path: evalPath, passed: false, code })
      }
    })

    proc.on('error', (error) => {
      reject({ path: evalPath, error })
    })
  })
}

async function main() {
  console.log('='.repeat(70))
  console.log('HyperSDK Evaluation Suite')
  console.log('='.repeat(70))

  try {
    // Discover all eval files
    const files = await readdir(EVALS_DIR)
    const evalFiles = files
      .filter(f => f.endsWith('.eval.js'))
      .sort()
      .map(f => join(EVALS_DIR, f))

    if (evalFiles.length === 0) {
      console.log('\n⚠️  No evaluation files found in evals/\n')
      process.exit(1)
    }

    console.log(`\nFound ${evalFiles.length} evaluation files:\n`)
    evalFiles.forEach((file, i) => {
      const name = file.split('/').pop()
      console.log(`  ${i + 1}. ${name}`)
    })
    console.log()

    // Run all evals
    const results = []
    for (const evalPath of evalFiles) {
      const name = evalPath.split('/').pop()
      console.log(`\n${'▶'.repeat(70)}`)
      console.log(`Running: ${name}`)
      console.log('▶'.repeat(70))

      const result = await runEval(evalPath)
      results.push(result)
    }

    // Summary
    console.log('\n' + '='.repeat(70))
    console.log('Evaluation Summary')
    console.log('='.repeat(70))

    const passed = results.filter(r => r.passed).length
    const failed = results.length - passed

    console.log(`\nTotal Evaluations: ${results.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)

    if (failed > 0) {
      console.log('\n❌ Failed Evaluations:')
      results.filter(r => !r.passed).forEach(r => {
        const name = r.path.split('/').pop()
        console.log(`  ✗ ${name} (exit code: ${r.code})`)
      })
      console.log('\n' + '='.repeat(70))
      process.exit(1)
    } else {
      console.log('\n✅ All evaluations passed successfully!')
      console.log('='.repeat(70))
      console.log('\n🎉 HyperSDK validation complete!\n')
      process.exit(0)
    }

  } catch (error) {
    console.error('\n❌ Error running evaluations:', error)
    process.exit(1)
  }
}

main()
