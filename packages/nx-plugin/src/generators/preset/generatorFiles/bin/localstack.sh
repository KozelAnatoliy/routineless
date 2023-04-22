localstack start -d
echo "Waiting for LocalStack startup..."  
localstack wait -t 30                     
echo "Startup complete"