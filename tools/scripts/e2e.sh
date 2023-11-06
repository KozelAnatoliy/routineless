npm run registry > /dev/null &
P1=$!
nx run-many --target=e2e &
P2=$!
wait $P2
E2E=$?
kill $P1
exit $E2E
