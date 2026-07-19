#!/usr/bin/env python3
"""Generate ReadIt.xcodeproj/project.pbxproj for the macOS menu-bar app."""

import os
import uuid

ROOT = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(ROOT, "ReadIt")
TESTS = os.path.join(ROOT, "ReadItTests")

SOURCE_FILES = []
for dirpath, _, filenames in os.walk(APP):
    for f in sorted(filenames):
        if f.endswith(".swift"):
            rel = os.path.relpath(os.path.join(dirpath, f), ROOT)
            SOURCE_FILES.append(rel)
SOURCE_FILES.sort()

RESOURCE_FILES = []
for dirpath, _, filenames in os.walk(APP):
    for f in sorted(filenames):
        if f == "Info.plist":
            rel = os.path.relpath(os.path.join(dirpath, f), ROOT)
            RESOURCE_FILES.append(rel)

TEST_FILES = []
if os.path.isdir(TESTS):
    for f in sorted(os.listdir(TESTS)):
        if f.endswith(".swift"):
            TEST_FILES.append(os.path.join("ReadItTests", f))


def uid():
    return uuid.uuid4().hex[:24].upper()


ids = {k: uid() for k in [
    "project", "main_target", "test_target", "app_product", "test_product",
    "sources_phase", "frameworks_phase", "resources_phase", "test_sources_phase",
    "build_config_list_project", "build_config_list_target", "build_config_list_test",
    "debug_project", "release_project", "debug_target", "release_target",
    "debug_test", "release_test", "package_ref", "package_product",
    "info_plist_ref",
]}

file_refs = {}
build_files = {}
for path in SOURCE_FILES + TEST_FILES:
    file_refs[path] = uid()
    build_files[path] = uid()

info_plist_path = "ReadIt/Info.plist"
file_refs[info_plist_path] = ids["info_plist_ref"]

pbx = '''// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 56;
	objects = {

/* Begin PBXBuildFile section */
'''
for path in SOURCE_FILES:
    pbx += f'\t\t{build_files[path]} /* {os.path.basename(path)} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_refs[path]} /* {os.path.basename(path)} */; }};\n'
for path in TEST_FILES:
    pbx += f'\t\t{build_files[path]} /* {os.path.basename(path)} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_refs[path]} /* {os.path.basename(path)} */; }};\n'
pbx += f'\t\t{ids["package_product"]} /* ReadItCore in Frameworks */ = {{isa = PBXBuildFile; productRef = {ids["package_product"]}_PROD /* ReadItCore */; }};\n'
pbx += '''/* End PBXBuildFile section */

/* Begin PBXFileReference section */
'''
pbx += f'\t\t{ids["app_product"]} /* ReadIt.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = ReadIt.app; sourceTree = BUILT_PRODUCTS_DIR; }};\n'
pbx += f'\t\t{ids["test_product"]} /* ReadItTests.xctest */ = {{isa = PBXFileReference; explicitFileType = wrapper.cfbundle; includeInIndex = 0; path = ReadItTests.xctest; sourceTree = BUILT_PRODUCTS_DIR; }};\n'
pbx += f'\t\t{ids["info_plist_ref"]} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; }};\n'
for path in SOURCE_FILES:
    # Path relative to the ReadIt/ group (keeps Audio/, Views/, etc.).
    rel_path = os.path.relpath(os.path.join(ROOT, path), APP).replace("\\", "/")
    pbx += (
        f'\t\t{file_refs[path]} /* {os.path.basename(path)} */ = '
        f'{{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; '
        f'path = {rel_path}; sourceTree = "<group>"; }};\n'
    )
for path in TEST_FILES:
    pbx += (
        f'\t\t{file_refs[path]} /* {os.path.basename(path)} */ = '
        f'{{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; '
        f'path = {os.path.basename(path)}; sourceTree = "<group>"; }};\n'
    )
pbx += '''/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
'''
pbx += f'''\t\t{ids["frameworks_phase"]} /* Frameworks */ = {{
\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t\t{ids["package_product"]} /* ReadItCore in Frameworks */,
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
'''
pbx += '''/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
'''
main_group = uid()
app_group = uid()
test_group = uid()
products_group = uid()

pbx += f'''\t\t{main_group} = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{app_group} /* ReadIt */,
\t\t\t\t{test_group} /* ReadItTests */,
\t\t\t\t{products_group} /* Products */,
\t\t\t);
\t\t\tsourceTree = "<group>";
\t\t}};
'''
pbx += f'''\t\t{products_group} /* Products */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{ids["app_product"]} /* ReadIt.app */,
\t\t\t\t{ids["test_product"]} /* ReadItTests.xctest */,
\t\t\t);
\t\t\tname = Products;
\t\t\tsourceTree = "<group>";
\t\t}};
'''
pbx += f'\t\t{app_group} /* ReadIt */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n'
for path in SOURCE_FILES:
    pbx += f'\t\t\t\t{file_refs[path]} /* {os.path.basename(path)} */,\n'
pbx += f'\t\t\t\t{ids["info_plist_ref"]} /* Info.plist */,\n'
pbx += f'\t\t\t);\n\t\t\tpath = ReadIt;\n\t\t\tsourceTree = "<group>";\n\t\t}};\n'

pbx += f'\t\t{test_group} /* ReadItTests */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n'
for path in TEST_FILES:
    pbx += f'\t\t\t\t{file_refs[path]} /* {os.path.basename(path)} */,\n'
pbx += f'\t\t\t);\n\t\t\tpath = ReadItTests;\n\t\t\tsourceTree = "<group>";\n\t\t}};\n'
pbx += '''/* End PBXGroup section */

/* Begin PBXNativeTarget section */
'''
pbx += f'''\t\t{ids["main_target"]} /* ReadIt */ = {{
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = {ids["build_config_list_target"]} /* Build configuration list for PBXNativeTarget "ReadIt" */;
\t\t\tbuildPhases = (
\t\t\t\t{ids["sources_phase"]} /* Sources */,
\t\t\t\t{ids["frameworks_phase"]} /* Frameworks */,
\t\t\t\t{ids["resources_phase"]} /* Resources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = ReadIt;
\t\t\tpackageProductDependencies = (
\t\t\t\t{ids["package_product"]}_PROD /* ReadItCore */,
\t\t\t);
\t\t\tproductName = ReadIt;
\t\t\tproductReference = {ids["app_product"]} /* ReadIt.app */;
\t\t\tproductType = "com.apple.product-type.application";
\t\t}};
'''
pbx += f'''\t\t{ids["test_target"]} /* ReadItTests */ = {{
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = {ids["build_config_list_test"]} /* Build configuration list for PBXNativeTarget "ReadItTests" */;
\t\t\tbuildPhases = (
\t\t\t\t{ids["test_sources_phase"]} /* Sources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = ReadItTests;
\t\t\tproductName = ReadItTests;
\t\t\tproductReference = {ids["test_product"]} /* ReadItTests.xctest */;
\t\t\tproductType = "com.apple.product-type.bundle.unit-test";
\t\t}};
'''
pbx += '''/* End PBXNativeTarget section */

/* Begin PBXProject section */
'''
pbx += f'''\t\t{ids["project"]} /* Project object */ = {{
\t\t\tisa = PBXProject;
\t\t\tattributes = {{
\t\t\t\tBuildIndependentTargetsInParallel = 1;
\t\t\t\tLastSwiftUpdateCheck = 1500;
\t\t\t\tLastUpgradeCheck = 1500;
\t\t\t\tTargetAttributes = {{
\t\t\t\t\t{ids["main_target"]} = {{
\t\t\t\t\t\tCreatedOnToolsVersion = 15.0;
\t\t\t\t\t}};
\t\t\t\t}};
\t\t\t}};
\t\t\tbuildConfigurationList = {ids["build_config_list_project"]} /* Build configuration list for PBXProject "ReadIt" */;
\t\t\tcompatibilityVersion = "Xcode 14.0";
\t\t\tdevelopmentRegion = en;
\t\t\thasScannedForEncodings = 0;
\t\t\tknownRegions = (
\t\t\t\ten,
\t\t\t\tBase,
\t\t\t);
\t\t\tmainGroup = {main_group};
\t\t\tpackageReferences = (
\t\t\t\t{ids["package_ref"]} /* XCLocalSwiftPackageReference "ReadItCore" */,
\t\t\t);
\t\t\tproductRefGroup = {products_group} /* Products */;
\t\t\tprojectDirPath = "";
\t\t\tprojectRoot = "";
\t\t\ttargets = (
\t\t\t\t{ids["main_target"]} /* ReadIt */,
\t\t\t\t{ids["test_target"]} /* ReadItTests */,
\t\t\t);
\t\t}};
'''
pbx += '''/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
'''
pbx += f'''\t\t{ids["resources_phase"]} /* Resources */ = {{
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
'''
pbx += '''/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
'''
pbx += f'\t\t{ids["sources_phase"]} /* Sources */ = {{\n\t\t\tisa = PBXSourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n'
for path in SOURCE_FILES:
    pbx += f'\t\t\t\t{build_files[path]} /* {os.path.basename(path)} in Sources */,\n'
pbx += '\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n'
pbx += f'\t\t{ids["test_sources_phase"]} /* Sources */ = {{\n\t\t\tisa = PBXSourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n'
for path in TEST_FILES:
    pbx += f'\t\t\t\t{build_files[path]} /* {os.path.basename(path)} in Sources */,\n'
pbx += '\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t};\n'
pbx += '''/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
'''

configs = [
    (ids["debug_project"], "Debug", "project"),
    (ids["release_project"], "Release", "project"),
    (ids["debug_target"], "Debug", "target"),
    (ids["release_target"], "Release", "target"),
    (ids["debug_test"], "Debug", "test"),
    (ids["release_test"], "Release", "test"),
]

for bid, name, level in configs:
    if level == "project":
        settings = f'''
\t\t\tbuildSettings = {{
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;
\t\t\t\tENABLE_TESTABILITY = YES;
\t\t\t\tMACOSX_DEPLOYMENT_TARGET = 14.0;
\t\t\t\tONLY_ACTIVE_ARCH = YES;
\t\t\t\tSDKROOT = macosx;
\t\t\t\tSWIFT_VERSION = 5.9;
\t\t\t}};
\t\t\tname = {name};'''
    elif level == "test":
        settings = f'''
\t\t\tbuildSettings = {{
\t\t\t\tBUNDLE_LOADER = "$(TEST_HOST)";
\t\t\t\tGENERATE_INFOPLIST_FILE = YES;
\t\t\t\tMACOSX_DEPLOYMENT_TARGET = 14.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.readit.app.tests;
\t\t\t\tSDKROOT = macosx;
\t\t\t\tSWIFT_VERSION = 5.9;
\t\t\t\tTEST_HOST = "$(BUILT_PRODUCTS_DIR)/ReadIt.app/Contents/MacOS/ReadIt";
\t\t\t}};
\t\t\tname = {name};'''
    else:
        settings = f'''
\t\t\tbuildSettings = {{
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCOMBINE_HIDPI_IMAGES = YES;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tENABLE_APP_SANDBOX = NO;
\t\t\t\tENABLE_HARDENED_RUNTIME = YES;
\t\t\t\tENABLE_PREVIEWS = YES;
\t\t\t\tGENERATE_INFOPLIST_FILE = NO;
\t\t\t\tINFOPLIST_FILE = ReadIt/Info.plist;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (
\t\t\t\t\t"$(inherited)",
\t\t\t\t\t"@executable_path/../Frameworks",
\t\t\t\t);
\t\t\t\tMACOSX_DEPLOYMENT_TARGET = 14.0;
\t\t\t\tMARKETING_VERSION = 1.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.readit.app;
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSDKROOT = macosx;
\t\t\t\tSWIFT_VERSION = 5.9;
\t\t\t}};
\t\t\tname = {name};'''
    pbx += f'\t\t{bid} /* {name} */ = {{isa = XCBuildConfiguration;{settings}\n\t\t}};\n'

pbx += '''/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
'''
for list_id, label, children in [
    (ids["build_config_list_project"], "ReadIt project", [ids["debug_project"], ids["release_project"]]),
    (ids["build_config_list_target"], "ReadIt", [ids["debug_target"], ids["release_target"]]),
    (ids["build_config_list_test"], "ReadItTests", [ids["debug_test"], ids["release_test"]]),
]:
    pbx += f'''\t\t{list_id} /* Build configuration list for PBXNativeTarget "{label}" */ = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{children[0]} /* Debug */,
\t\t\t\t{children[1]} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
'''
pbx += '''/* End XCConfigurationList section */

/* Begin XCLocalSwiftPackageReference section */
'''
pbx += f'''\t\t{ids["package_ref"]} /* XCLocalSwiftPackageReference "ReadItCore" */ = {{
\t\t\tisa = XCLocalSwiftPackageReference;
\t\t\trelativePath = ../ReadItCore;
\t\t}};
'''
pbx += '''/* End XCLocalSwiftPackageReference section */

/* Begin XCSwiftPackageProductDependency section */
'''
pbx += f'''\t\t{ids["package_product"]}_PROD /* ReadItCore */ = {{
\t\t\tisa = XCSwiftPackageProductDependency;
\t\t\tproductName = ReadItCore;
\t\t\tpackage = {ids["package_ref"]} /* XCLocalSwiftPackageReference "ReadItCore" */;
\t\t}};
'''
pbx += '''/* End XCSwiftPackageProductDependency section */
	};
	rootObject = ''' + ids["project"] + ''' /* Project object */;
}
'''

out_dir = os.path.join(ROOT, "ReadIt.xcodeproj")
os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, "project.pbxproj"), "w") as f:
    f.write(pbx)

# Shared scheme so `xcodebuild -scheme ReadIt` works in CI.
scheme_dir = os.path.join(out_dir, "xcshareddata", "xcschemes")
os.makedirs(scheme_dir, exist_ok=True)
scheme = f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1500"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "{ids["main_target"]}"
               BuildableName = "ReadIt.app"
               BlueprintName = "ReadIt"
               ReferencedContainer = "container:ReadIt.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <TestAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      shouldUseLaunchSchemeArgsEnv = "YES"
      shouldAutocreateTestPlan = "YES">
   </TestAction>
   <LaunchAction
      buildConfiguration = "Release"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useCustomWorkingDirectory = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{ids["main_target"]}"
            BuildableName = "ReadIt.app"
            BlueprintName = "ReadIt"
            ReferencedContainer = "container:ReadIt.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useCustomWorkingDirectory = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{ids["main_target"]}"
            BuildableName = "ReadIt.app"
            BlueprintName = "ReadIt"
            ReferencedContainer = "container:ReadIt.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
'''
with open(os.path.join(scheme_dir, "ReadIt.xcscheme"), "w") as f:
    f.write(scheme)

print(f"Generated project with {len(SOURCE_FILES)} source files + shared scheme")
