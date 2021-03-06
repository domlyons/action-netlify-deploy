import * as core from '@actions/core'
import NetlifyAPI from 'netlify'
import * as path from 'path'
import fetch from 'node-fetch'

const NETLIFY_BASE_URL = 'https://api.netlify.com/api/v1/sites'

async function run(): Promise<void> {
  try {
    const token = process.env.NETLIFY_AUTH_TOKEN
    const site = process.env.NETLIFY_SITE_ID

    if (!token) {
      core.setFailed('NETLIFY_AUTH_TOKEN must be passed in the env')
      return
    }

    if (!site) {
      core.setFailed('NETLIFY_SITE_ID must be passed in the env')
      return
    }

    const dir = core.getInput('dir', {required: true})
    const message = core.getInput('message', {required: true})
    const alias = core.getInput('alias', {required: false})

    // Update this if Github Actions ever decides to actually pass yaml booleans as js booleans
    const isProdVar = core.getInput('isProd', {required: true}).toLowerCase()
    let isProd
    if (isProdVar === 'true') {
      isProd = true
    } else if (isProdVar === 'false') {
      isProd = false
    } else {
      core.setFailed('isProd must be one of `true` or `false`')
      return
    }
    // https://api.netlify.com/api/v1/sites/{site_id}/deploys/{deploy_id}/restore
    // Create Netlify API client
    const client = new NetlifyAPI(token)

    // Resolve publish directory
    const buildDir = path.resolve(process.cwd(), dir)

    // Deploy to Netlify
    const deploy = await client.deploy(site, buildDir, {
      draft: !isProd,
      message,
      branch: alias
    })

    if (isProd) {
      const result = await fetch(
        `${NETLIFY_BASE_URL}/${site}/deploys/${deploy.deployId}/restore`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
    }

    core.setOutput('deploy-id', deploy.deployId)
    core.setOutput('deploy-url', deploy.deploy.deploy_ssl_url)
    core.setOutput('deploy-json', deploy.deploy)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
