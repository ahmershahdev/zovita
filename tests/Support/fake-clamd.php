<?php

/**
 * A tiny stand-in for ClamAV's clamd, speaking the real INSTREAM protocol over TCP, so the
 * scanner client is tested against an actual socket:
 *   client: "zINSTREAM\0", then chunks of <uint32 big-endian length><bytes>, then a zero length
 *   server: "stream: OK\0" or "stream: <signature> FOUND\0"
 * Flags a harmless marker string instead of EICAR, because desktop antivirus (e.g. Windows
 * Defender) quarantines EICAR files the moment a test writes them. Usage: php fake-clamd.php <port>
 */
$port = (int) ($argv[1] ?? 3310);
$server = stream_socket_server("tcp://127.0.0.1:{$port}", $errno, $error);
if (! $server) {
    fwrite(STDERR, "cannot listen: {$error}\n");
    exit(1);
}
fwrite(STDOUT, "ready\n");

while ($client = @stream_socket_accept($server, 60)) {
    $command = '';
    while (! str_ends_with($command, "\0") && ($byte = fread($client, 1)) !== '' && $byte !== false) {
        $command .= $byte;
    }
    $data = '';
    if ($command === "zINSTREAM\0") {
        while (true) {
            $header = stream_get_contents($client, 4);
            if (strlen($header) < 4) {
                break;
            }
            $length = unpack('N', $header)[1];
            if ($length === 0) {
                break;
            }
            $data .= stream_get_contents($client, $length);
        }
    }
    $infected = str_contains($data, 'ZOVITA-FAKE-MALWARE-MARKER');
    fwrite($client, $infected ? "stream: Zovita-Test-Signature FOUND\0" : "stream: OK\0");
    fclose($client);
}
