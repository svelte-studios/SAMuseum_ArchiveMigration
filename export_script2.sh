rootDir=$PWD
find . -name "*.accdb" | while read -r dbpath;  do dirName=${dbpath%/*};  echo $dirName;  dbname=${dbpath##*/};  echo $dbname;  cd $dirName;
java -jar ../access2csv.jar $dbname; cd $rootDir; done