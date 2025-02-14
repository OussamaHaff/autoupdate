// Workaround for tests attempting to hit the GH API if running in an env where
// this variable is automatically set.
if ('GITHUB_TOKEN' in process.env) {
  delete process.env.GITHUB_TOKEN;
}

import { createMock } from 'ts-auto-mock';
import nock from 'nock';
import config from '../src/config-loader';
import { AutoUpdater } from '../src/autoupdater';
import { Output } from '../src/Output';
import { Endpoints } from '@octokit/types';
import {
  PullRequestEvent,
  PushEvent,
  WebhookEvent,
  WorkflowDispatchEvent,
  WorkflowRunEvent,
} from '@octokit/webhooks-definitions/schema';

type PullRequestResponse =
  Endpoints['GET /repos/{owner}/{repo}/pulls/{pull_number}']['response'];

jest.mock('../src/config-loader');

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(config, 'githubToken').mockImplementation(() => 'test-token');
});

const emptyEvent = {} as WebhookEvent;
const owner = 'chinthakagodawita';
const repo = 'not-a-real-repo';
const base = 'master';
const head = 'develop';
const branch = 'not-a-real-branch';

const dummyPushEvent = createMock<PushEvent>({
  ref: `refs/heads/${branch}`,
  repository: {
    owner: {
      login: owner,
    },
    name: repo,
  },
});
const dummyWorkflowDispatchEvent = createMock<WorkflowDispatchEvent>({
  ref: `refs/heads/${branch}`,
  repository: {
    owner: {
      login: owner,
    },
    name: repo,
  },
});
const dummyWorkflowRunPushEvent = createMock<WorkflowRunEvent>({
  workflow_run: {
    event: 'push',
    head_branch: branch,
  },
  repository: {
    owner: {
      name: owner,
    },
    name: repo,
  },
});
const dummyWorkflowRunPullRequestEvent = createMock<WorkflowRunEvent>({
  workflow_run: {
    event: 'pull_request',
    head_branch: branch,
  },
  repository: {
    owner: {
      name: owner,
    },
    name: repo,
  },
});
const dummyScheduleEvent = {
  schedule: '*/5 * * * *',
};
const invalidLabelPull = {
  number: 1,
  merged: false,
  state: 'open',
  labels: [
    {
      id: 1,
    },
  ],
  base: {
    ref: base,
    label: base,
  },
  head: {
    label: head,
    ref: head,
    repo: {
      name: repo,
      owner: {
        login: owner,
      },
    },
  },
};
const validPull = {
  number: 1,
  merged: false,
  state: 'open',
  labels: [
    {
      id: 1,
      name: 'one',
    },
    {
      id: 2,
      name: 'two',
    },
  ],
  base: {
    ref: base,
    label: base,
  },
  head: {
    label: head,
    ref: head,
    repo: {
      name: repo,
      owner: {
        login: owner,
      },
    },
  },
  draft: false,
};
const clonePull = () => JSON.parse(JSON.stringify(validPull));
const checkRunsMock = {
  total_count: 1,
  check_runs: [
    {
      id: 6368329592,
      name: 'Mergeable: Title and description check',
      node_id: 'CR_kwDOGkv22s8AAAABe5T_eA',
      head_sha: 'fe729deda9f7efd338ff3491e914cb6ac2911631',
      external_id: '',
      status: 'completed',
      conclusion: 'success',
      started_at: '2022-05-10T10:40:43Z',
      completed_at: '2022-05-10T10:40:47Z',
      output: {
        title: 'title',
        summary: 'summary',
        text: 'desc',
        annotations_count: 0,
      },
      check_suite: {
        id: 6405182391,
      },
      app: {
        id: 11156,
        slug: 'suite1',
        node_id: 'MDM6QXBwMTExNTY=',
        owner: {
          login: 'mergeability',
          id: 39203367,
          node_id: 'MDEyOk9yZ2FuaXphdGlvbjM5MjAzMzY3',
          gravatar_id: '',
          type: 'Organization',
          site_admin: false,
        },
        name: 'suite1',
        description: 'desk',
        created_at: '2018-04-17T06:53:44Z',
        updated_at: '2020-08-08T05:28:57Z',
      },
      pull_requests: [],
    },
  ],
};

const checkSuitesMock = [
  {
    total_count: 1,
    check_runs: [
      {
        id: 6368329592,
        name: 'Mergeable: Title and description check',
        node_id: 'CR_kwDOGkv22s8AAAABe5T_eA',
        head_sha: 'fe729deda9f7efd338ff3491e914cb6ac2911631',
        external_id: '',
        status: 'completed',
        conclusion: 'success',
        started_at: '2022-05-10T10:40:43Z',
        completed_at: '2022-05-10T10:40:47Z',
        output: {
          title: '1/3 Fail(s):  TITLE',
          summary: 'summary',
          text: 'text',
          annotations_count: 0,
          annotations_url: '',
        },
        check_suite: {
          id: 6405182391,
        },
        app: {
          id: 11156,
          slug: 'suite1',
          node_id: 'MDM6QXBwMTExNTY=',
          owner: {
            login: 'mergeability',
            id: 39203367,
            node_id: 'MDEyOk9yZ2FuaXphdGlvbjM5MjAzMzY3',
            avatar_url: 'https://avatars.githubusercontent.com/u/39203367?v=4',
            gravatar_id: '',
            site_admin: false,
          },
          name: 'Mergeable',
          description: 'description ',
          created_at: '2018-04-17T06:53:44Z',
          updated_at: '2020-08-08T05:28:57Z',
        },
        pull_requests: [],
      },
    ],
  },
];
const combinedStatusMock = {
  state: 'success',
  statuses: [
    {
      url: 'https://api.github.com/repos/octocat/Hello-World/statuses/6dcb09b5b57875f334f61aebed695e2e4193db5e',
      avatar_url: 'https://github.com/images/error/hubot_happy.gif',
      id: 1,
      node_id: 'MDY6U3RhdHVzMQ==',
      state: 'success',
      description: 'Build has completed successfully',
      target_url: 'https://ci.example.com/1000/output',
      context: 'continuous-integration/jenkins',
      created_at: '2012-07-20T01:19:13Z',
      updated_at: '2012-07-20T01:19:13Z',
    },
    {
      url: 'https://api.github.com/repos/octocat/Hello-World/statuses/6dcb09b5b57875f334f61aebed695e2e4193db5e',
      avatar_url: 'https://github.com/images/error/other_user_happy.gif',
      id: 2,
      node_id: 'MDY6U3RhdHVzMg==',
      state: 'success',
      description: 'Testing has completed successfully',
      target_url: 'https://ci.example.com/2000/output',
      context: 'security/brakeman',
      created_at: '2012-08-20T01:19:13Z',
      updated_at: '2012-08-20T01:19:13Z',
    },
  ],
  sha: '6dcb09b5b57875f334f61aebed695e2e4193db5e',
  total_count: 2,
  repository: {
    id: 1296269,
    node_id: 'MDEwOlJlcG9zaXRvcnkxMjk2MjY5',
    name: 'Hello-World',
    full_name: 'octocat/Hello-World',
    owner: {
      login: 'octocat',
      id: 1,
      node_id: 'MDQ6VXNlcjE=',
      avatar_url: 'https://github.com/images/error/octocat_happy.gif',
      gravatar_id: '',
      url: 'https://api.github.com/users/octocat',
      html_url: 'https://github.com/octocat',
      followers_url: 'https://api.github.com/users/octocat/followers',
      following_url:
        'https://api.github.com/users/octocat/following{/other_user}',
      gists_url: 'https://api.github.com/users/octocat/gists{/gist_id}',
      starred_url:
        'https://api.github.com/users/octocat/starred{/owner}{/repo}',
      subscriptions_url: 'https://api.github.com/users/octocat/subscriptions',
      organizations_url: 'https://api.github.com/users/octocat/orgs',
      repos_url: 'https://api.github.com/users/octocat/repos',
      events_url: 'https://api.github.com/users/octocat/events{/privacy}',
      received_events_url:
        'https://api.github.com/users/octocat/received_events',
      type: 'User',
      site_admin: false,
    },
    private: false,
    html_url: 'https://github.com/octocat/Hello-World',
    description: 'This your first repo!',
    fork: false,
    url: 'https://api.github.com/repos/octocat/Hello-World',
    archive_url:
      'https://api.github.com/repos/octocat/Hello-World/{archive_format}{/ref}',
    assignees_url:
      'https://api.github.com/repos/octocat/Hello-World/assignees{/user}',
    blobs_url:
      'https://api.github.com/repos/octocat/Hello-World/git/blobs{/sha}',
    branches_url:
      'https://api.github.com/repos/octocat/Hello-World/branches{/branch}',
    collaborators_url:
      'https://api.github.com/repos/octocat/Hello-World/collaborators{/collaborator}',
    comments_url:
      'https://api.github.com/repos/octocat/Hello-World/comments{/number}',
    commits_url:
      'https://api.github.com/repos/octocat/Hello-World/commits{/sha}',
    compare_url:
      'https://api.github.com/repos/octocat/Hello-World/compare/{base}...{head}',
    contents_url:
      'https://api.github.com/repos/octocat/Hello-World/contents/{+path}',
    contributors_url:
      'https://api.github.com/repos/octocat/Hello-World/contributors',
    deployments_url:
      'https://api.github.com/repos/octocat/Hello-World/deployments',
    downloads_url: 'https://api.github.com/repos/octocat/Hello-World/downloads',
    events_url: 'https://api.github.com/repos/octocat/Hello-World/events',
    forks_url: 'https://api.github.com/repos/octocat/Hello-World/forks',
    git_commits_url:
      'https://api.github.com/repos/octocat/Hello-World/git/commits{/sha}',
    git_refs_url:
      'https://api.github.com/repos/octocat/Hello-World/git/refs{/sha}',
    git_tags_url:
      'https://api.github.com/repos/octocat/Hello-World/git/tags{/sha}',
    git_url: 'git:github.com/octocat/Hello-World.git',
    issue_comment_url:
      'https://api.github.com/repos/octocat/Hello-World/issues/comments{/number}',
    issue_events_url:
      'https://api.github.com/repos/octocat/Hello-World/issues/events{/number}',
    issues_url:
      'https://api.github.com/repos/octocat/Hello-World/issues{/number}',
    keys_url: 'https://api.github.com/repos/octocat/Hello-World/keys{/key_id}',
    labels_url:
      'https://api.github.com/repos/octocat/Hello-World/labels{/name}',
    languages_url: 'https://api.github.com/repos/octocat/Hello-World/languages',
    merges_url: 'https://api.github.com/repos/octocat/Hello-World/merges',
    milestones_url:
      'https://api.github.com/repos/octocat/Hello-World/milestones{/number}',
    notifications_url:
      'https://api.github.com/repos/octocat/Hello-World/notifications{?since,all,participating}',
    pulls_url:
      'https://api.github.com/repos/octocat/Hello-World/pulls{/number}',
    releases_url:
      'https://api.github.com/repos/octocat/Hello-World/releases{/id}',
    ssh_url: 'git@github.com:octocat/Hello-World.git',
    stargazers_url:
      'https://api.github.com/repos/octocat/Hello-World/stargazers',
    statuses_url:
      'https://api.github.com/repos/octocat/Hello-World/statuses/{sha}',
    subscribers_url:
      'https://api.github.com/repos/octocat/Hello-World/subscribers',
    subscription_url:
      'https://api.github.com/repos/octocat/Hello-World/subscription',
    tags_url: 'https://api.github.com/repos/octocat/Hello-World/tags',
    teams_url: 'https://api.github.com/repos/octocat/Hello-World/teams',
    trees_url:
      'https://api.github.com/repos/octocat/Hello-World/git/trees{/sha}',
    hooks_url: 'http://api.github.com/repos/octocat/Hello-World/hooks',
  },
  commit_url:
    'https://api.github.com/repos/octocat/Hello-World/6dcb09b5b57875f334f61aebed695e2e4193db5e',
  url: 'https://api.github.com/repos/octocat/Hello-World/6dcb09b5b57875f334f61aebed695e2e4193db5e/status',
};
describe('test `prNeedsUpdate`', () => {
  test('pull request has already been merged', async () => {
    const pull = {
      merged: true,
    };

    const updater = new AutoUpdater(config, emptyEvent);
    const needsUpdate = await updater.prNeedsUpdate(
      pull as unknown as PullRequestResponse['data'],
    );
    expect(needsUpdate).toEqual(false);
  });

  test('pull request is not open', async () => {
    const pull = {
      merged: false,
      state: 'closed',
    };

    const updater = new AutoUpdater(config, emptyEvent);
    const needsUpdate = await updater.prNeedsUpdate(
      pull as unknown as PullRequestResponse['data'],
    );
    expect(needsUpdate).toEqual(false);
  });

  test('originating repo of pull request has been deleted', async () => {
    const pull = Object.assign({}, validPull, {
      head: {
        label: head,
        ref: head,
        repo: null,
      },
    });
    const updater = new AutoUpdater(config, {} as WebhookEvent);
    const needsUpdate = await updater.prNeedsUpdate(
      pull as unknown as PullRequestResponse['data'],
    );
    expect(needsUpdate).toEqual(false);
  });

  test('pull request is not behind', async () => {
    const scope = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 0,
      });

    const updater = new AutoUpdater(config, emptyEvent);
    const needsUpdate = await updater.prNeedsUpdate(
      validPull as unknown as PullRequestResponse['data'],
    );

    expect(needsUpdate).toEqual(false);
    expect(scope.isDone()).toEqual(true);
  });

  test('excluded labels were configured but not found', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('all');
    (config.excludedLabels as jest.Mock).mockReturnValue(['label']);

    const scope = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const updater = new AutoUpdater(config, emptyEvent);
    const needsUpdate = await updater.prNeedsUpdate(
      validPull as unknown as PullRequestResponse['data'],
    );

    expect(needsUpdate).toEqual(true);
    expect(scope.isDone()).toEqual(true);
    expect(config.pullRequestFilter).toHaveBeenCalled();
    expect(config.excludedLabels).toHaveBeenCalled();
  });

  test('excluded labels exist', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('all');
    (config.pullRequestLabels as jest.Mock).mockReturnValue([]);
    (config.excludedLabels as jest.Mock).mockReturnValue(['dependencies']);

    const scope = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const updater = new AutoUpdater(config, emptyEvent);
    const pull = clonePull();
    pull.labels = [
      {
        id: 3,
        name: 'autoupdate',
      },
      {
        id: 4,
        name: 'dependencies',
      },
    ];
    const needsUpdate = await updater.prNeedsUpdate(pull);

    expect(needsUpdate).toEqual(false);
    expect(scope.isDone()).toEqual(true);
    expect(config.excludedLabels).toHaveBeenCalled();

    // The excluded labels check happens before we check any filters so these
    // functions should never be called.
    expect(config.pullRequestFilter).toHaveBeenCalledTimes(0);
    expect(config.pullRequestLabels).toHaveBeenCalledTimes(0);
  });

  test('no pull request labels were configured', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('labelled');
    (config.pullRequestLabels as jest.Mock).mockReturnValue([]);
    (config.excludedLabels as jest.Mock).mockReturnValue([]);

    const scope = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const updater = new AutoUpdater(config, emptyEvent);
    const needsUpdate = await updater.prNeedsUpdate(
      validPull as unknown as PullRequestResponse['data'],
    );

    expect(needsUpdate).toEqual(false);
    expect(scope.isDone()).toEqual(true);
    expect(config.pullRequestFilter).toHaveBeenCalled();
    expect(config.pullRequestLabels).toHaveBeenCalled();
    expect(config.excludedLabels).toHaveBeenCalled();
  });

  test('pull request has no labels', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('labelled');
    (config.pullRequestLabels as jest.Mock).mockReturnValue(['one', 'two']);
    (config.excludedLabels as jest.Mock).mockReturnValue([]);

    const scope = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const updater = new AutoUpdater(config, emptyEvent);
    const pull = clonePull();
    pull.labels = [];
    const needsUpdate = await updater.prNeedsUpdate(pull);

    expect(needsUpdate).toEqual(false);
    expect(scope.isDone()).toEqual(true);
    expect(config.pullRequestFilter).toHaveBeenCalled();
    expect(config.pullRequestLabels).toHaveBeenCalled();
    expect(config.excludedLabels).toHaveBeenCalled();
  });

  test('pull request has labels with no name', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('labelled');
    (config.pullRequestLabels as jest.Mock).mockReturnValue(['one', 'two']);
    (config.excludedLabels as jest.Mock).mockReturnValue([]);

    const scope = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const updater = new AutoUpdater(config, emptyEvent);
    const needsUpdate = await updater.prNeedsUpdate(
      invalidLabelPull as unknown as PullRequestResponse['data'],
    );

    expect(needsUpdate).toEqual(false);
    expect(scope.isDone()).toEqual(true);
    expect(config.pullRequestFilter).toHaveBeenCalled();
    expect(config.pullRequestLabels).toHaveBeenCalled();
    expect(config.excludedLabels).toHaveBeenCalled();
  });

  test('pull request has labels with no name - excluded labels checked', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('labelled');
    (config.pullRequestLabels as jest.Mock).mockReturnValue([]);
    (config.excludedLabels as jest.Mock).mockReturnValue(['one', 'two']);

    const scope = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const updater = new AutoUpdater(config, emptyEvent);
    const needsUpdate = await updater.prNeedsUpdate(
      invalidLabelPull as unknown as PullRequestResponse['data'],
    );

    expect(needsUpdate).toEqual(false);
    expect(scope.isDone()).toEqual(true);
    expect(config.pullRequestFilter).toHaveBeenCalled();
    expect(config.pullRequestLabels).toHaveBeenCalled();
    expect(config.excludedLabels).toHaveBeenCalled();
  });

  test('pull request labels do not match', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('labelled');
    (config.pullRequestLabels as jest.Mock).mockReturnValue(['three', 'four']);
    (config.excludedLabels as jest.Mock).mockReturnValue([]);

    const scope = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const updater = new AutoUpdater(config, emptyEvent);
    const needsUpdate = await updater.prNeedsUpdate(
      validPull as unknown as PullRequestResponse['data'],
    );

    expect(needsUpdate).toEqual(false);
    expect(scope.isDone()).toEqual(true);
    expect(config.pullRequestFilter).toHaveBeenCalled();
    expect(config.pullRequestLabels).toHaveBeenCalled();
    expect(config.excludedLabels).toHaveBeenCalled();
  });

  test('pull request labels do match', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('labelled');
    (config.pullRequestLabels as jest.Mock).mockReturnValue(['three', 'four']);
    (config.excludedLabels as jest.Mock).mockReturnValue([]);

    const scope = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const updater = new AutoUpdater(config, emptyEvent);
    const pull = clonePull();
    pull.labels = [
      {
        id: 3,
        name: 'three',
      },
    ];
    const needsUpdate = await updater.prNeedsUpdate(pull);

    expect(needsUpdate).toEqual(true);
    expect(scope.isDone()).toEqual(true);
  });

  test('pull request is against protected branch', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('protected');
    (config.excludedLabels as jest.Mock).mockReturnValue([]);

    const comparePr = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const getBranch = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/branches/${base}`)
      .reply(200, {
        protected: true,
      });

    const updater = new AutoUpdater(config, emptyEvent);
    const needsUpdate = await updater.prNeedsUpdate(
      validPull as unknown as PullRequestResponse['data'],
    );

    expect(needsUpdate).toEqual(true);
    expect(comparePr.isDone()).toEqual(true);
    expect(getBranch.isDone()).toEqual(true);
    expect(config.pullRequestFilter).toHaveBeenCalled();
    expect(config.excludedLabels).toHaveBeenCalled();
  });

  test('pull request is not against protected branch', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('protected');
    (config.excludedLabels as jest.Mock).mockReturnValue([]);

    const comparePr = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const getBranch = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/branches/${base}`)
      .reply(200, {
        protected: false,
      });

    const updater = new AutoUpdater(config, emptyEvent);
    const needsUpdate = await updater.prNeedsUpdate(
      validPull as unknown as PullRequestResponse['data'],
    );

    expect(needsUpdate).toEqual(false);
    expect(comparePr.isDone()).toEqual(true);
    expect(getBranch.isDone()).toEqual(true);
    expect(config.pullRequestFilter).toHaveBeenCalled();
    expect(config.excludedLabels).toHaveBeenCalled();
  });

  test('pull request is against branch with auto_merge enabled', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('auto_merge');
    (config.excludedLabels as jest.Mock).mockReturnValue([]);

    const comparePr = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const updater = new AutoUpdater(config, emptyEvent);

    const pull = {
      ...validPull,
      auto_merge: {
        enabled_by: {
          login: 'chinthakagodawita',
        },
        merge_method: 'squash',
        commit_title: 'some-commit-title',
        commit_message: 'fixing a thing',
      },
    } as unknown as PullRequestResponse['data'];
    const needsUpdate = await updater.prNeedsUpdate(pull);

    expect(needsUpdate).toEqual(true);
    expect(comparePr.isDone()).toEqual(true);
    expect(config.pullRequestFilter).toHaveBeenCalled();
  });

  test('pull request is against branch with auto_merge disabled', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('auto_merge');
    (config.excludedLabels as jest.Mock).mockReturnValue([]);

    const comparePr = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const updater = new AutoUpdater(config, emptyEvent);

    const pull = {
      ...validPull,
      auto_merge: null,
    } as unknown as PullRequestResponse['data'];
    const needsUpdate = await updater.prNeedsUpdate(pull);

    expect(needsUpdate).toEqual(false);
    expect(comparePr.isDone()).toEqual(true);
    expect(config.pullRequestFilter).toHaveBeenCalled();
  });

  test('no filters configured', async () => {
    (config.pullRequestFilter as jest.Mock).mockReturnValue('all');
    (config.excludedLabels as jest.Mock).mockReturnValue([]);

    const comparePr = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(200, {
        behind_by: 1,
      });

    const updater = new AutoUpdater(config, emptyEvent);
    const needsUpdate = await updater.prNeedsUpdate(
      validPull as unknown as PullRequestResponse['data'],
    );

    expect(needsUpdate).toEqual(true);
    expect(comparePr.isDone()).toEqual(true);
    expect(config.pullRequestFilter).toHaveBeenCalled();
    expect(config.excludedLabels).toHaveBeenCalled();
  });

  describe('pull request ready state filtering', () => {
    const readyPull = clonePull();
    const draftPull = Object.assign(clonePull(), { draft: true });

    const nockCompareRequest = () =>
      nock('https://api.github.com:443')
        .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
        .reply(200, {
          behind_by: 1,
        });

    beforeEach(() => {
      (config.excludedLabels as jest.Mock).mockReturnValue([]);
    });

    test('pull request ready state is not filtered', async () => {
      (config.pullRequestReadyState as jest.Mock).mockReturnValue('all');

      const readyScope = nockCompareRequest();
      const draftScope = nockCompareRequest();

      const updater = new AutoUpdater(config, emptyEvent);

      const readyPullNeedsUpdate = await updater.prNeedsUpdate(readyPull);
      const draftPullNeedsUpdate = await updater.prNeedsUpdate(draftPull);

      expect(readyPullNeedsUpdate).toEqual(true);
      expect(draftPullNeedsUpdate).toEqual(true);
      expect(config.pullRequestReadyState).toHaveBeenCalled();
      expect(readyScope.isDone()).toEqual(true);
      expect(draftScope.isDone()).toEqual(true);
    });

    test('pull request is filtered to drafts only', async () => {
      (config.pullRequestReadyState as jest.Mock).mockReturnValue('draft');

      const readyScope = nockCompareRequest();
      const draftScope = nockCompareRequest();

      const updater = new AutoUpdater(config, emptyEvent);

      const readyPullNeedsUpdate = await updater.prNeedsUpdate(readyPull);
      const draftPullNeedsUpdate = await updater.prNeedsUpdate(draftPull);

      expect(readyPullNeedsUpdate).toEqual(false);
      expect(draftPullNeedsUpdate).toEqual(true);
      expect(config.pullRequestReadyState).toHaveBeenCalled();
      expect(readyScope.isDone()).toEqual(true);
      expect(draftScope.isDone()).toEqual(true);
    });

    test('pull request ready state is filtered to ready PRs only', async () => {
      (config.pullRequestReadyState as jest.Mock).mockReturnValue(
        'ready_for_review',
      );

      const readyScope = nockCompareRequest();
      const draftScope = nockCompareRequest();

      const updater = new AutoUpdater(config, emptyEvent);
      const readyPullNeedsUpdate = await updater.prNeedsUpdate(readyPull);
      const draftPullNeedsUpdate = await updater.prNeedsUpdate(draftPull);

      expect(readyPullNeedsUpdate).toEqual(true);
      expect(draftPullNeedsUpdate).toEqual(false);
      expect(config.pullRequestReadyState).toHaveBeenCalled();
      expect(readyScope.isDone()).toEqual(true);
      expect(draftScope.isDone()).toEqual(true);
    });

    test('push event when PR must check suites for pass', async () => {
      (config.pullRequestMustPassChecks as jest.Mock).mockReturnValue(true);
      (config.checkSuitesToPass as jest.Mock).mockReturnValue(['suite1']);
      (config.prRateLimit as jest.Mock).mockReturnValue(1);
      (config.mergeMsg as jest.Mock).mockReturnValue('Merge msg');

      const updater = new AutoUpdater(config, dummyPushEvent);
      const updateSpy = jest.spyOn(updater, 'merge').mockResolvedValue(true);

      const pullsMock = [];
      const expectedPulls = 1;
      for (let i = 0; i < expectedPulls; i++) {
        pullsMock.push({
          id: i,
          number: i,
          state: 'open',
          head: {
            repo: {
              name: `${repo}`,
              owner: {
                login: `${owner}`,
              },
            },
            ref: '72310e808eee18a19e05dd0bb9fd999067ae5720',
          },
          base: {
            ref: '72310e808eee18a19e05dd0bb9fd999067ae5720',
          },
        });
      }

      nock('https://api.github.com:443')
        .get(
          `/repos/${owner}/${repo}/pulls?base=${branch}&state=open&sort=updated&direction=desc`,
        )
        .reply(200, pullsMock)
        .get(
          `/repos/${owner}/${repo}/commits/72310e808eee18a19e05dd0bb9fd999067ae5720/check-runs`,
        )
        .reply(200, checkRunsMock)
        .get(
          `/repos/${owner}/${repo}/commits/72310e808eee18a19e05dd0bb9fd999067ae5720/status`,
        )
        .reply(200, combinedStatusMock)
        .get(
          `/repos/${owner}/${repo}/check-suites/72310e808eee18a19e05dd0bb9fd999067ae5720/check-runs`,
        )
        .reply(200, checkSuitesMock);

      const updated = await updater.handlePush();

      expect(updated).toEqual(1);
    });

    test('push event when PR must check suites for fail', async () => {
      (config.pullRequestMustPassChecks as jest.Mock).mockReturnValue(true);
      (config.checkSuitesToPass as jest.Mock).mockReturnValue(['suite1']);
      (config.prRateLimit as jest.Mock).mockReturnValue(1);
      (config.mergeMsg as jest.Mock).mockReturnValue('Merge msg');

      combinedStatusMock.state = 'fail';

      const updater = new AutoUpdater(config, dummyPushEvent);
      const updateSpy = jest.spyOn(updater, 'merge').mockResolvedValue(true);

      const pullsMock = [];
      const expectedPulls = 1;
      for (let i = 0; i < expectedPulls; i++) {
        pullsMock.push({
          id: i,
          number: i,
          state: 'open',
          head: {
            repo: {
              name: `${repo}`,
              owner: {
                login: `${owner}`,
              },
            },
            ref: '72310e808eee18a19e05dd0bb9fd999067ae5720',
          },
          base: {
            ref: '72310e808eee18a19e05dd0bb9fd999067ae5720',
          },
        });
      }

      nock('https://api.github.com:443')
        .get(
          `/repos/${owner}/${repo}/pulls?base=${branch}&state=open&sort=updated&direction=desc`,
        )
        .reply(200, pullsMock)
        .get(
          `/repos/${owner}/${repo}/commits/72310e808eee18a19e05dd0bb9fd999067ae5720/check-runs`,
        )
        .reply(200, checkRunsMock)
        .get(
          `/repos/${owner}/${repo}/commits/72310e808eee18a19e05dd0bb9fd999067ae5720/status`,
        )
        .reply(200, combinedStatusMock)
        .get(
          `/repos/${owner}/${repo}/check-suites/72310e808eee18a19e05dd0bb9fd999067ae5720/check-runs`,
        )
        .reply(200, checkSuitesMock);

      const updated = await updater.handlePush();

      expect(updated).toEqual(0);
    });
  });
});

describe('test `handlePush`', () => {
  const cloneEvent = () => JSON.parse(JSON.stringify(dummyPushEvent));

  test('push event on a non-branch', async () => {
    const event = cloneEvent();
    event.ref = 'not-a-branch';

    const updater = new AutoUpdater(config, event);

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const updated = await updater.handlePush();

    expect(updated).toEqual(0);
    expect(updateSpy).toHaveBeenCalledTimes(0);
  });

  test('push event on a branch without any PRs', async () => {
    const updater = new AutoUpdater(config, dummyPushEvent);

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const scope = nock('https://api.github.com:443')
      .get(
        `/repos/${owner}/${repo}/pulls?base=${branch}&state=open&sort=updated&direction=desc`,
      )
      .reply(200, []);

    const updated = await updater.handlePush();

    expect(updated).toEqual(0);
    expect(updateSpy).toHaveBeenCalledTimes(0);
    expect(scope.isDone()).toEqual(true);
  });

  test('push event on a branch with PRs', async () => {
    const updater = new AutoUpdater(config, dummyPushEvent);

    const pullsMock = [];
    const expectedPulls = 5;
    for (let i = 0; i < expectedPulls; i++) {
      pullsMock.push({
        id: i,
        number: i,
      });
    }

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const scope = nock('https://api.github.com:443')
      .get(
        `/repos/${owner}/${repo}/pulls?base=${branch}&state=open&sort=updated&direction=desc`,
      )
      .reply(200, pullsMock);

    const updated = await updater.handlePush();

    expect(updated).toEqual(expectedPulls);
    expect(updateSpy).toHaveBeenCalledTimes(expectedPulls);
    expect(scope.isDone()).toEqual(true);
  });

  test('push event with invalid owner', async () => {
    const invalidPushEvent = createMock<PushEvent>({
      ref: `refs/heads/${branch}`,
      repository: {
        owner: {
          login: '',
        },
        name: repo,
      },
    });
    const updater = new AutoUpdater(config, invalidPushEvent);
    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const updated = await updater.handlePush();

    expect(updated).toEqual(0);
    expect(updateSpy).toHaveBeenCalledTimes(0);
  });

  test('push event with invalid repo name', async () => {
    const invalidPushEvent = createMock<PushEvent>({
      ref: `refs/heads/${branch}`,
      repository: {
        owner: {
          login: owner,
        },
        name: '',
      },
    });
    const updater = new AutoUpdater(config, invalidPushEvent);
    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const updated = await updater.handlePush();

    expect(updated).toEqual(0);
    expect(updateSpy).toHaveBeenCalledTimes(0);
  });

  test('push event when PR reaches rate limit', async () => {
    (config.prRateLimit as jest.Mock).mockReturnValue(1);

    const updater = new AutoUpdater(config, dummyPushEvent);

    const pullsMock = [];
    const expectedPulls = 2;
    for (let i = 0; i < expectedPulls; i++) {
      pullsMock.push({
        id: i,
        number: i,
      });
    }

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    nock('https://api.github.com:443')
      .get(
        `/repos/${owner}/${repo}/pulls?base=${branch}&state=open&sort=updated&direction=desc`,
      )
      .reply(200, pullsMock);

    const updated = await updater.handlePush();

    expect(updated).toEqual(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  test('push event when no PR rate limit is set', async () => {
    const updater = new AutoUpdater(config, dummyPushEvent);

    const pullsMock = [];
    const expectedPulls = 2;
    for (let i = 0; i < expectedPulls; i++) {
      pullsMock.push({
        id: i,
        number: i,
      });
    }

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    nock('https://api.github.com:443')
      .get(
        `/repos/${owner}/${repo}/pulls?base=${branch}&state=open&sort=updated&direction=desc`,
      )
      .reply(200, pullsMock);

    const updated = await updater.handlePush();

    expect(updated).toEqual(2);
    expect(updateSpy).toHaveBeenCalledTimes(2);
  });
});

describe('test `handleSchedule`', () => {
  test('schedule event on a branch with PRs', async () => {
    jest
      .spyOn(config, 'githubRef')
      .mockImplementation(() => `refs/heads/${base}`);

    jest
      .spyOn(config, 'githubRepository')
      .mockImplementation(() => `${owner}/${repo}`);

    const event = dummyScheduleEvent;
    const updater = new AutoUpdater(config, event as unknown as WebhookEvent);

    const pullsMock = [];
    const expectedPulls = 5;
    for (let i = 0; i < expectedPulls; i++) {
      pullsMock.push({
        id: i,
        number: i,
      });
    }

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const scope = nock('https://api.github.com:443')
      .get(
        `/repos/${owner}/${repo}/pulls?base=${base}&state=open&sort=updated&direction=desc`,
      )
      .reply(200, pullsMock);

    const updated = await updater.handleSchedule();

    expect(updated).toEqual(expectedPulls);
    expect(updateSpy).toHaveBeenCalledTimes(expectedPulls);
    expect(scope.isDone()).toEqual(true);
  });

  test('schedule event with undefined GITHUB_REPOSITORY env var', async () => {
    jest
      .spyOn(config, 'githubRef')
      .mockImplementation(() => `refs/heads/${base}`);

    const event = dummyScheduleEvent;
    const updater = new AutoUpdater(config, event as unknown as WebhookEvent);

    await expect(updater.handleSchedule()).rejects.toThrowError();
  });

  test('schedule event with undefined GITHUB_REF env var', async () => {
    jest
      .spyOn(config, 'githubRepository')
      .mockImplementation(() => `${owner}/${repo}`);

    const event = dummyScheduleEvent;
    const updater = new AutoUpdater(config, event as unknown as WebhookEvent);
    await expect(updater.handleSchedule()).rejects.toThrowError();
  });

  test('schedule event with invalid GITHUB_REPOSITORY env var', async () => {
    jest.spyOn(config, 'githubRepository').mockImplementation(() => '');
    jest
      .spyOn(config, 'githubRef')
      .mockImplementation(() => `refs/heads/${base}`);

    const event = dummyScheduleEvent;
    const updater = new AutoUpdater(config, event as unknown as WebhookEvent);
    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const updated = await updater.handleSchedule();

    expect(updated).toEqual(0);
    expect(updateSpy).toHaveBeenCalledTimes(0);
  });
});

describe('test `handleWorkflowDispatch`', () => {
  test('workflow dispatch event', async () => {
    const updater = new AutoUpdater(config, dummyWorkflowDispatchEvent);

    const pullsMock = [];
    const expectedPulls = 5;
    for (let i = 0; i < expectedPulls; i++) {
      pullsMock.push({
        id: i,
        number: i,
      });
    }

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const scope = nock('https://api.github.com:443')
      .get(
        `/repos/${owner}/${repo}/pulls?base=${branch}&state=open&sort=updated&direction=desc`,
      )
      .reply(200, pullsMock);

    const updated = await updater.handleWorkflowDispatch();

    expect(updated).toEqual(expectedPulls);
    expect(updateSpy).toHaveBeenCalledTimes(expectedPulls);
    expect(scope.isDone()).toEqual(true);
  });
});

describe('test `handleWorkflowRun`', () => {
  const cloneEvent = () =>
    JSON.parse(JSON.stringify(dummyWorkflowRunPushEvent));

  test('workflow_run event by push event on a non-branch', async () => {
    const event = cloneEvent();
    event.workflow_run.head_branch = '';

    const updater = new AutoUpdater(config, event);

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const updated = await updater.handleWorkflowRun();

    expect(updated).toEqual(0);
    expect(updateSpy).toHaveBeenCalledTimes(0);
  });

  test('workflow_run event by push event on a branch without any PRs', async () => {
    const updater = new AutoUpdater(config, dummyWorkflowRunPushEvent);

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const scope = nock('https://api.github.com:443')
      .get(
        `/repos/${owner}/${repo}/pulls?base=${branch}&state=open&sort=updated&direction=desc`,
      )
      .reply(200, []);

    const updated = await updater.handleWorkflowRun();

    expect(updated).toEqual(0);
    expect(updateSpy).toHaveBeenCalledTimes(0);
    expect(scope.isDone()).toEqual(true);
  });

  test('workflow_run event by push event on a branch with PRs', async () => {
    const updater = new AutoUpdater(config, dummyWorkflowRunPushEvent);

    const pullsMock = [];
    const expectedPulls = 5;
    for (let i = 0; i < expectedPulls; i++) {
      pullsMock.push({
        id: i,
        number: i,
      });
    }

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const scope = nock('https://api.github.com:443')
      .get(
        `/repos/${owner}/${repo}/pulls?base=${branch}&state=open&sort=updated&direction=desc`,
      )
      .reply(200, pullsMock);

    const updated = await updater.handleWorkflowRun();

    expect(updated).toEqual(expectedPulls);
    expect(updateSpy).toHaveBeenCalledTimes(expectedPulls);
    expect(scope.isDone()).toEqual(true);
  });

  test('workflow_run event by pull_request event with an update triggered', async () => {
    const updater = new AutoUpdater(
      config,
      createMock<WorkflowRunEvent>(dummyWorkflowRunPullRequestEvent),
    );

    const pullsMock = [];
    const expectedPulls = 2;
    for (let i = 0; i < expectedPulls; i++) {
      pullsMock.push({
        id: i,
        number: i,
      });
    }

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const scope = nock('https://api.github.com:443')
      .get(
        `/repos/${owner}/${repo}/pulls?base=${branch}&state=open&sort=updated&direction=desc`,
      )
      .reply(200, pullsMock);

    const updated = await updater.handleWorkflowRun();

    expect(updated).toEqual(expectedPulls);
    expect(updateSpy).toHaveBeenCalledTimes(expectedPulls);
    expect(scope.isDone()).toEqual(true);
  });

  test('workflow_run event by pull_request event without an update', async () => {
    const updater = new AutoUpdater(
      config,
      createMock<WorkflowRunEvent>(dummyWorkflowRunPullRequestEvent),
    );

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(false);

    const scope = nock('https://api.github.com:443')
      .get(
        `/repos/${owner}/${repo}/pulls?base=${branch}&state=open&sort=updated&direction=desc`,
      )
      .reply(200, []);

    const updated = await updater.handleWorkflowRun();

    expect(updated).toEqual(0);
    expect(updateSpy).toHaveBeenCalledTimes(0);
    expect(scope.isDone()).toEqual(true);
  });

  test('workflow_run event with an unsupported event type', async () => {
    const event = cloneEvent();
    event.workflow_run.event = 'pull_request_review';

    const updater = new AutoUpdater(config, event);

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);

    const updated = await updater.handleWorkflowRun();

    expect(updated).toEqual(0);
    expect(updateSpy).toHaveBeenCalledTimes(0);
  });
});

describe('test `handlePullRequest`', () => {
  test('pull request event with an update triggered', async () => {
    const updater = new AutoUpdater(config, createMock<PullRequestEvent>());

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(true);
    const updated = await updater.handlePullRequest();

    expect(updated).toEqual(true);
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  test('pull request event without an update', async () => {
    const updater = new AutoUpdater(config, createMock<PullRequestEvent>());

    const updateSpy = jest.spyOn(updater, 'update').mockResolvedValue(false);
    const updated = await updater.handlePullRequest();

    expect(updated).toEqual(false);
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });
});

describe('test `update`', () => {
  test('when a pull request does not need an update', async () => {
    const updater = new AutoUpdater(config, emptyEvent);
    const updateSpy = jest
      .spyOn(updater, 'prNeedsUpdate')
      .mockResolvedValue(false);
    const needsUpdate = await updater.update(owner, <any>validPull);
    expect(needsUpdate).toEqual(false);
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  test('dry run mode', async () => {
    (config.dryRun as jest.Mock).mockReturnValue(true);
    const updater = new AutoUpdater(config, emptyEvent);
    const updateSpy = jest
      .spyOn(updater, 'prNeedsUpdate')
      .mockResolvedValue(true);
    const mergeSpy = jest.spyOn(updater, 'merge');
    const needsUpdate = await updater.update(owner, <any>validPull);

    expect(needsUpdate).toEqual(true);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(mergeSpy).toHaveBeenCalledTimes(0);
  });

  test('pull request without a head repository', async () => {
    const updater = new AutoUpdater(config, emptyEvent);
    const updateSpy = jest
      .spyOn(updater, 'prNeedsUpdate')
      .mockResolvedValue(true);
    const mergeSpy = jest.spyOn(updater, 'merge');

    const pull = {
      ...validPull,
      head: {
        ...validPull.head,
        repo: null,
      },
    };

    const needsUpdate = await updater.update(owner, <any>pull);

    expect(needsUpdate).toEqual(false);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(mergeSpy).toHaveBeenCalledTimes(0);
  });

  test('custom merge message', async () => {
    const mergeMsg = 'dummy-merge-msg';
    (config.mergeMsg as jest.Mock).mockReturnValue(mergeMsg);
    const updater = new AutoUpdater(config, emptyEvent);

    const updateSpy = jest
      .spyOn(updater, 'prNeedsUpdate')
      .mockResolvedValue(true);
    const mergeSpy = jest.spyOn(updater, 'merge').mockResolvedValue(true);
    const needsUpdate = await updater.update(owner, <any>validPull);

    const expectedMergeOpts = {
      owner: validPull.head.repo.owner.login,
      repo: validPull.head.repo.name,
      commit_message: mergeMsg,
      base: validPull.head.ref,
      head: validPull.base.ref,
    };

    expect(needsUpdate).toEqual(true);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(mergeSpy).toHaveBeenCalledWith(
      owner,
      validPull.number,
      expectedMergeOpts,
    );
  });

  test('merge with no message', async () => {
    (config.mergeMsg as jest.Mock).mockReturnValue('');
    const updater = new AutoUpdater(config, emptyEvent);

    const updateSpy = jest
      .spyOn(updater, 'prNeedsUpdate')
      .mockResolvedValue(true);
    const mergeSpy = jest.spyOn(updater, 'merge').mockResolvedValue(true);
    const needsUpdate = await updater.update(owner, <any>validPull);

    const expectedMergeOpts = {
      owner: validPull.head.repo.owner.login,
      repo: validPull.head.repo.name,
      base: validPull.head.ref,
      head: validPull.base.ref,
    };

    expect(needsUpdate).toEqual(true);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(mergeSpy).toHaveBeenCalledWith(
      owner,
      validPull.number,
      expectedMergeOpts,
    );
  });
});

describe('test `merge`', () => {
  const mergeOpts = {
    owner: validPull.head.repo.owner.login,
    repo: validPull.head.repo.name,
    commit_message: 'dummy-msg',
    base: validPull.head.ref,
    head: validPull.base.ref,
  };

  const responseCodeTests = [
    {
      code: 204,
      description: 'branch update not required',
      success: true,
    },
    {
      code: 200,
      description: 'merge successful',
      success: true,
    },
    {
      code: 503,
      description: 'merge error',
      success: false,
    },
    {
      code: 403,
      description: 'authorisation error',
      success: false,
    },
  ];

  for (const responseTest of responseCodeTests) {
    test(responseTest.description, async () => {
      (config.retryCount as jest.Mock).mockReturnValue(0);
      (config.retrySleep as jest.Mock).mockReturnValue(0);
      (config.mergeConflictAction as jest.Mock).mockReturnValue(null);
      const updater = new AutoUpdater(config, emptyEvent);

      const scope = nock('https://api.github.com:443')
        .post(`/repos/${owner}/${repo}/merges`, {
          commit_message: mergeOpts.commit_message,
          base: mergeOpts.base,
          head: mergeOpts.head,
        })
        .reply(responseTest.code);

      const setOutput = jest.fn();

      if (responseTest.success) {
        await updater.merge(owner, 1, mergeOpts, setOutput);
      } else {
        await expect(
          updater.merge(owner, 1, mergeOpts, setOutput),
        ).rejects.toThrowError();
      }

      expect(setOutput).toHaveBeenCalledTimes(1);
      expect(setOutput).toHaveBeenCalledWith(Output.Conflicted, false);

      expect(scope.isDone()).toEqual(true);
    });
  }

  test('retry logic', async () => {
    const retryCount = 3;
    (config.retryCount as jest.Mock).mockReturnValue(retryCount);
    (config.mergeConflictAction as jest.Mock).mockReturnValue(null);
    const updater = new AutoUpdater(config, emptyEvent);

    const scopes = [];
    for (let i = 0; i <= retryCount; i++) {
      const scope = nock('https://api.github.com:443')
        .post(`/repos/${owner}/${repo}/merges`, {
          commit_message: mergeOpts.commit_message,
          base: mergeOpts.base,
          head: mergeOpts.head,
        })
        .reply(503);
      scopes.push(scope);
    }

    await expect(updater.merge(owner, 1, mergeOpts)).rejects.toThrowError();

    for (const scope of scopes) {
      expect(scope.isDone()).toEqual(true);
    }
  });

  test('handles errors from compareCommitsWithBasehead', async () => {
    (config.retryCount as jest.Mock).mockReturnValue(0);
    const updater = new AutoUpdater(config, emptyEvent);

    const scope = nock('https://api.github.com:443')
      .get(`/repos/${owner}/${repo}/compare/${head}...${base}`)
      .reply(404, {
        message: 'Not Found',
      });

    const needsUpdate = await updater.update(owner, <any>validPull);
    expect(needsUpdate).toEqual(false);
    expect(scope.isDone()).toEqual(true);
  });

  test('handles fork authorisation errors', async () => {
    (config.retryCount as jest.Mock).mockReturnValue(0);
    const updater = new AutoUpdater(config, emptyEvent);

    const scope = nock('https://api.github.com:443')
      .post(`/repos/${owner}/${repo}/merges`, {
        commit_message: mergeOpts.commit_message,
        base: mergeOpts.base,
        head: mergeOpts.head,
      })
      .reply(403, {
        message: 'Must have admin rights to Repository.',
      });

    const setOutput = jest.fn();

    await updater.merge('some-other-owner', 1, mergeOpts, setOutput);

    expect(setOutput).toHaveBeenCalledTimes(1);
    expect(setOutput).toHaveBeenCalledWith(Output.Conflicted, false);

    expect(scope.isDone()).toEqual(true);
  });

  test('throws an error on non-fork authorisation errors', async () => {
    (config.retryCount as jest.Mock).mockReturnValue(0);
    const updater = new AutoUpdater(config, emptyEvent);

    const scope = nock('https://api.github.com:443')
      .post(`/repos/${owner}/${repo}/merges`, {
        commit_message: mergeOpts.commit_message,
        base: mergeOpts.base,
        head: mergeOpts.head,
      })
      .reply(403, {
        message: 'Must have admin rights to Repository.',
      });

    const setOutput = jest.fn();

    await expect(
      updater.merge(owner, 1, mergeOpts, setOutput),
    ).rejects.toThrowError('Must have admin rights to Repository.');

    expect(setOutput).toHaveBeenCalledTimes(1);
    expect(setOutput).toHaveBeenCalledWith(Output.Conflicted, false);

    expect(scope.isDone()).toEqual(true);
  });

  test('ignore merge conflicts', async () => {
    (config.retryCount as jest.Mock).mockReturnValue(0);
    (config.mergeConflictAction as jest.Mock).mockReturnValue('ignore');
    const updater = new AutoUpdater(config, emptyEvent);

    const scope = nock('https://api.github.com:443')
      .post(`/repos/${owner}/${repo}/merges`, {
        commit_message: mergeOpts.commit_message,
        base: mergeOpts.base,
        head: mergeOpts.head,
      })
      .reply(409, {
        message: 'Merge conflict',
      });

    const setOutput = jest.fn();
    await updater.merge(owner, 1, mergeOpts, setOutput);

    expect(scope.isDone()).toEqual(true);

    expect(setOutput).toHaveBeenCalledTimes(1);
    expect(setOutput).toHaveBeenCalledWith(Output.Conflicted, true);
  });

  test('not ignoring merge conflicts', async () => {
    (config.retryCount as jest.Mock).mockReturnValue(0);
    (config.mergeConflictAction as jest.Mock).mockReturnValue(null);
    const updater = new AutoUpdater(config, emptyEvent);

    const scope = nock('https://api.github.com:443')
      .post(`/repos/${owner}/${repo}/merges`, {
        commit_message: mergeOpts.commit_message,
        base: mergeOpts.base,
        head: mergeOpts.head,
      })
      .reply(409, {
        message: 'Merge conflict',
      });

    const setOutput = jest.fn();
    await expect(
      updater.merge(owner, 1, mergeOpts, setOutput),
    ).rejects.toThrowError('Merge conflict');

    expect(scope.isDone()).toEqual(true);

    expect(setOutput).toHaveBeenCalledTimes(1);
    expect(setOutput).toHaveBeenCalledWith(Output.Conflicted, true);
  });

  test('continue if merging throws an error', async () => {
    (config.mergeMsg as jest.Mock).mockReturnValue(null);
    const updater = new AutoUpdater(config, dummyPushEvent);

    const pullsMock = [];
    const expectedPulls = 5;
    for (let i = 0; i < expectedPulls; i++) {
      pullsMock.push({
        id: i,
        number: i,
        base: {
          ref: base,
          label: base,
        },
        head: {
          label: head,
          ref: head,
          repo: {
            name: repo,
            owner: {
              login: owner,
            },
          },
        },
      });
    }

    const needsUpdateSpy = jest
      .spyOn(updater, 'prNeedsUpdate')
      .mockResolvedValue(true);

    const pullsScope = nock('https://api.github.com:443')
      .get(
        `/repos/${owner}/${repo}/pulls?base=${branch}&state=open&sort=updated&direction=desc`,
      )
      .reply(200, pullsMock);

    const mergeScopes = [];
    for (let i = 0; i < expectedPulls; i++) {
      let httpStatus = 200;
      let response: Record<string, unknown> = {
        data: {
          sha: 'dummy-sha',
        },
      };

      // Throw an error halfway through the PR list to confirm that autoupdate
      // continues to the next PR.
      if (i === 3) {
        httpStatus = 403;
        response = {
          message: 'Resource not accessible by integration',
        };
      }

      mergeScopes.push(
        nock('https://api.github.com:443')
          .post(`/repos/${owner}/${repo}/merges`)
          .reply(httpStatus, response),
      );
    }

    const updated = await updater.handlePush();

    // Only 4 PRs should have been updated, not 5.
    expect(updated).toBe(expectedPulls - 1);
    expect(needsUpdateSpy).toHaveBeenCalledTimes(expectedPulls);
    expect(pullsScope.isDone()).toBe(true);
    for (const scope of mergeScopes) {
      expect(scope.isDone()).toBe(true);
    }
  });
});
