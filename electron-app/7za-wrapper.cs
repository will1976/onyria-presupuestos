using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;

class Program
{
    static int Main(string[] args)
    {
        string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        string realExe = Path.Combine(exeDir, "7za-real.exe");

        var sb = new StringBuilder();
        for (int i = 0; i < args.Length; i++)
        {
            if (i > 0) sb.Append(' ');
            string a = args[i];
            if (a.IndexOf(' ') >= 0 || a.IndexOf('"') >= 0)
                sb.Append('"').Append(a.Replace("\"", "\\\"")).Append('"');
            else
                sb.Append(a);
        }

        var psi = new ProcessStartInfo(realExe, sb.ToString());
        psi.UseShellExecute = false;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;
        psi.CreateNoWindow = true;

        var proc = Process.Start(psi);
        string stdout = proc.StandardOutput.ReadToEnd();
        string stderr = proc.StandardError.ReadToEnd();
        proc.WaitForExit();
        int code = proc.ExitCode;

        Console.Out.Write(stdout);
        Console.Error.Write(stderr);

        if (code == 2)
        {
            string combined = stdout + "\n" + stderr;
            string[] lines = combined.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
            bool onlySymlinkErrors = true;
            int errCount = 0;
            foreach (string raw in lines)
            {
                string line = raw.Trim();
                if (line.StartsWith("ERROR", StringComparison.OrdinalIgnoreCase))
                {
                    errCount++;
                    bool isSymlinkErr =
                        (line.IndexOf("Cannot create symbolic link", StringComparison.OrdinalIgnoreCase) >= 0)
                        || (line.IndexOf("symbolic link", StringComparison.OrdinalIgnoreCase) >= 0 && line.IndexOf("privilegio", StringComparison.OrdinalIgnoreCase) >= 0)
                        || (line.IndexOf("symbolic link", StringComparison.OrdinalIgnoreCase) >= 0 && line.IndexOf("privilege", StringComparison.OrdinalIgnoreCase) >= 0);
                    if (!isSymlinkErr)
                    {
                        onlySymlinkErrors = false;
                        break;
                    }
                }
            }
            if (onlySymlinkErrors && errCount > 0)
            {
                Console.Error.WriteLine("[7za-wrapper] Ignoring " + errCount + " symlink-only error(s); forcing exit 0.");
                return 0;
            }
        }

        return code;
    }
}
