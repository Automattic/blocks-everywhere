#!/bin/sh
sed "s/<?php /<?php\n\/\/ phpcs:ignore\n/" build/index.min.asset.php | sed "s/);/);\n/" > build/index.min.asset.php.new
mv build/index.min.asset.php.new build/index.min.asset.php

sed "s/<?php /<?php\n\/\/ phpcs:ignore\n/" build/support-content-editor.min.asset.php | sed "s/);/);\n/" > build/support-content-editor.min.asset.php.new
mv build/support-content-editor.min.asset.php.new build/support-content-editor.min.asset.php

sed "s/<?php /<?php\n\/\/ phpcs:ignore\n/" build/support-content-view.min.asset.php | sed "s/);/);\n/" > build/support-content-view.min.asset.php.new
mv build/support-content-view.min.asset.php.new build/support-content-view.min.asset.php
