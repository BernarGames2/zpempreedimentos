#!/usr/bin/env bash
# Reinicia o servidor de produção local na porta 3100 (uso em desenvolvimento/testes).
cd "$(dirname "$0")/.."
PIDS=$(ss -ltnp 2>/dev/null | grep ':3100 ' | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u)
[ -n "$PIDS" ] && kill $PIDS 2>/dev/null
for i in $(seq 1 40); do (echo > /dev/tcp/127.0.0.1/3100) 2>/dev/null || break; sleep 0.3; done
nohup npx next start -p 3100 > /tmp/next.log 2>&1 &
for i in $(seq 1 80); do curl -s -o /dev/null http://127.0.0.1:3100/ && break; sleep 0.3; done
echo "servidor no ar"
