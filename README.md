docker build -t image-classifier-web

docker run -d -p 8080:80 --name image-classifier-web image-classifier-web
