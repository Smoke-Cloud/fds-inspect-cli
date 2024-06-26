// deno-lint-ignore-file require-await
import { join } from "@std/path";
const { os } = Deno.build;

// Imported from x/is_docker
let hasDocker: boolean;

const hasDockerEnv = async () => {
  try {
    Deno.statSync("/.dockerenv");
    return true;
  } catch (_) {
    return false;
  }
};

const hasDockerCGroup = async () => {
  try {
    const data = Deno.readFileSync("/proc/self/cgroup");
    return new TextDecoder("utf-8").decode(data).includes("docker");
  } catch (_) {
    return false;
  }
};

export async function isDocker() {
  if (hasDocker === undefined) {
    hasDocker = await hasDockerEnv() || await hasDockerCGroup();
  }
  return hasDocker;
}

// Imported from x/is_wsl
let hasWsl: boolean;

const hasWslEnv = async () => {
  if (Deno.build.os !== "linux") {
    return false;
  }

  try {
    const build = Deno.readTextFileSync("/proc/version").toString()
      .toLowerCase();

    return build.includes("microsoft") ? !(await isDocker()) : false;
  } catch (_) {
    return false;
  }
};

export async function isWsl() {
  if (hasWsl === undefined) {
    hasWsl = await hasWslEnv();
  }

  return hasWsl;
}

// Imported from x/open

/**
 * Returns the directory where this file exists.
 * @param url Value returned from import.meta.url
 */
export function getDir(url: string) {
  const u = new URL(url);
  const file: string = u.protocol === "file:" ? u.pathname : url;
  const directory = file.replace(/[/][^/]*$/, "");
  return directory;
}

export interface OpenOptions {
  /**
  Wait for the opened app to exit before fulfilling the promise. If `false` it's fulfilled immediately when opening the app.
  Note that it waits for the app to exit, not just for the window to close.
  On Windows, you have to explicitly specify an app for it to be able to wait.
  @default false
  */
  readonly wait?: boolean;

  /**
  __macOS only__
  Do not bring the app to the foreground.
  @default false
  */
  readonly background?: boolean;

  /**
  Specify the app to open the `target` with, or an array with the app and app arguments.
  The app name is platform dependent. Don't hard code it in reusable modules. For example, Chrome is `google chrome` on macOS, `google-chrome` on Linux and `chrome` on Windows.
  You may also pass in the app's full path. For example on WSL, this can be `/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe` for the Windows installation of Chrome.
  */
  app?: string | string[];

  /**
  Uses `encodeURI` to encode the `target` before executing it.
  The use with targets that are not URLs is not recommended.
  Especially useful when dealing with the [double-quotes on Windows](https://github.com/sindresorhus/open#double-quotes-on-windows) caveat.
  @default false
  */
  readonly url?: boolean;
}

async function isFile(fileName: string): Promise<boolean> {
  try {
    const info = await Deno.stat(fileName);
    return info.isFile;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false; // File or directory exists
    } else throw err;
  }
}

// Path to included `xdg-open`.
const localXdgOpenPath = join(getDir(import.meta.url), "xdg-open");

export async function open(
  target: string,
  options?: OpenOptions,
): Promise<Deno.ChildProcess> {
  if (typeof target !== "string") {
    throw new TypeError("Expected a target");
  }

  const defaults = {
    wait: false,
    background: false,
    url: false,
  };

  options = { ...defaults, ...options };

  let command;
  let appArguments: string[] = [];
  const cliArguments: string[] = [];

  if (Array.isArray(options.app)) {
    appArguments = options.app.slice(1);
    options.app = options.app[0];
  }

  // Encodes the target as if it were an URL. Especially useful to get
  // double-quotes through the “double-quotes on Windows caveat”, but it
  // can be used on any platform.
  if (options.url) {
    target = encodeURI(target);
  }

  if (os === "darwin") {
    command = "open";

    if (options.wait) {
      cliArguments.push("--wait-apps");
    }

    if (options.background) {
      cliArguments.push("--background");
    }

    if (options.app) {
      cliArguments.push("-a", options.app);
    }
  } else if (os === "windows") {
    command = "cmd";
    cliArguments.push("/s", "/c", "start", "", "/b");

    if (options.wait) {
      cliArguments.push("/wait");
    }

    if (options.app) {
      cliArguments.push(options.app);
    }

    if (appArguments.length > 0) {
      cliArguments.push(...appArguments);
    }
  } else {
    const wsl = await isWsl();
    if (options.app) {
      command = options.app;
    } else if (wsl) {
      command = "wslview";
    } else {
      // When bundled by Webpack, there's no actual package file path and no local `xdg-open`.
      const isBundled = !getDir(import.meta.url) ||
        getDir(import.meta.url) === "/";

      // Check if local `xdg-open` exists and is executable.
      const exeLocalXdgOpen = await isFile(localXdgOpenPath);

      const useSystemXdgOpen = isBundled || !exeLocalXdgOpen;
      command = useSystemXdgOpen ? "xdg-open" : localXdgOpenPath;
    }

    if (appArguments.length > 0) {
      cliArguments.push(...appArguments);
    }
  }

  cliArguments.push(target);

  if (os === "darwin" && appArguments.length > 0) {
    cliArguments.push("--args", ...appArguments);
  }

  const cmd = new Deno.Command(command, {
    args: cliArguments,
    stdin: "piped",
    stderr: "piped",
    stdout: "piped",
  });

  const subprocess = cmd.spawn();
  // await subprocess.status();

  // command: open /Applications/Google\ Chrome.app {url}

  return subprocess;
}
