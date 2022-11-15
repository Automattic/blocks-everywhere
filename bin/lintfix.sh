#!/bin/sh
sed "s/<?php /<?php\n\/\/ phpcs:ignore\n/" build/index.min.asset.php | sed "s/);/);\n/" > build/index.min.asset.php.new
mv build/index.min.asset.php.new build/index.min.asset.php
